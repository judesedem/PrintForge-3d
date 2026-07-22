package com.printforge.auth.security;

import com.printforge.auth.entity.User;
import com.printforge.auth.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        try {
            final String email = jwtService.extractEmail(jwt);

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                if (jwtService.isTokenValid(jwt, userDetails.getUsername())) {

                    // Suspended accounts (#68) are rejected on every request
                    // from here on, even with a still-valid JWT — a
                    // moderation suspension has to take effect immediately,
                    // not just at next login. userDetailsService already
                    // looked this user up once above; this is a second,
                    // separate lookup because the UserDetailsService bean
                    // (ApplicationConfig) returns a plain Spring Security
                    // User, not the domain entity, so `suspended` isn't
                    // available on userDetails itself.
                    User user = userRepository.findByEmail(email).orElse(null);
                    if (user != null && Boolean.TRUE.equals(user.getSuspended())) {
                        SecurityContextHolder.clearContext();
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"status\":403,\"message\":\"Account suspended. Contact support.\"}");
                        return;
                    }

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (RuntimeException e) {
            // Malformed/expired/tampered token (ExpiredJwtException, MalformedJwtException,
            // SignatureException, IllegalArgumentException — all from the jjwt library) or
            // a stale token for a since-deleted user (UsernameNotFoundException). Previously
            // uncaught here, which propagated past the filter chain as a raw 500 instead of
            // a clean 401.
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":401,\"message\":\"Invalid or expired token\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
