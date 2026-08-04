package com.printforge.gateway.filter;

import com.printforge.gateway.repository.UserRoleRepository;
import com.printforge.gateway.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends AbstractGatewayFilterFactory<JwtAuthenticationFilter.Config> {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtUtil jwtUtil;
    private final UserRoleRepository userRoleRepository;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserRoleRepository userRoleRepository) {
        super(Config.class);
        this.jwtUtil = jwtUtil;
        this.userRoleRepository = userRoleRepository;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {

            if (!exchange.getRequest().getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                return chain.filter(exchange);
            }

            String authHeader = exchange.getRequest().getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                authHeader = authHeader.substring(7);
            } else {
                return chain.filter(exchange);
            }

            final String token = authHeader;
            final String email;

            // Matches the original's exception-safety exactly: isTokenValid()
            // and extractEmail() share one try/catch, same as the original
            // combined isTokenValid()+extractEmail()+extractRole() block —
            // extractEmail() re-parses the same claims isTokenValid() just
            // parsed, so in practice it won't throw if isTokenValid()
            // already succeeded, but this doesn't rely on that.
            try {
                if (!jwtUtil.isTokenValid(token)) {
                    return chain.filter(exchange);
                }
                email = jwtUtil.extractEmail(token);
            } catch (Exception e) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            // Role is deliberately NOT read from the token here (jwtUtil
            // still has extractRole() for other callers, unused in this
            // class now) — a role claim baked in at login time can go
            // stale (e.g. upgrade-to-designer), causing 403s on every
            // role-gated downstream endpoint until the user's token is
            // reissued at next login. Re-reading the live role from the DB
            // on every request means a role change takes effect on the
            // very next request, same as auth-service's own JwtAuthFilter
            // already does for `suspended`. Blocking JDBC call, so it's
            // wrapped off the reactive event-loop thread onto
            // boundedElastic — this is the standard pattern for a blocking
            // call inside a WebFlux/Gateway filter, not a workaround.
            return Mono.fromCallable(() -> userRoleRepository.findRoleByEmail(email))
                    .subscribeOn(Schedulers.boundedElastic())
                    .flatMap(maybeRole -> {
                        if (maybeRole.isEmpty()) {
                            // Token parses fine, but no matching user row —
                            // e.g. the account was deleted since the token
                            // was issued. Fail closed rather than forward a
                            // request with no role at all.
                            log.warn("Live role lookup found no user for email {} (valid token, stale/deleted account) — rejecting.", email);
                            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                            return exchange.getResponse().setComplete();
                        }
                        String liveRole = maybeRole.get();
                        ServerHttpRequest request = exchange.getRequest().mutate()
                                .header("X-Auth-Email", email)
                                .header("X-Auth-Role", liveRole)
                                .build();
                        return chain.filter(exchange.mutate().request(request).build());
                    })
                    .onErrorResume(dbError -> {
                        // DB unreachable/network blip — do NOT fall back to
                        // the token's stale role claim, that would defeat
                        // the entire point of this check. Same fail-closed
                        // shape as the malformed-token 401 above.
                        log.error("Live role lookup failed for email {}: {}", email, dbError.getMessage(), dbError);
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete();
                    });
        };
    }

    public static class Config {
        // configuration properties if needed
    }
}
