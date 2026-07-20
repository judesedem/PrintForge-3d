package com.printforge.printforge.config;

import com.printforge.printforge.security.JwtAuthEntryPoint;
import com.printforge.printforge.security.JwtAuthFilter;
import com.printforge.printforge.security.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;
    private final JwtAuthEntryPoint jwtAuthEntryPoint;
    private final RateLimitFilter rateLimitFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/payments/webhook").permitAll()
                // A user who forgot their password can't authenticate, so
                // these two have to be public — same reasoning as
                // register/login above. Neither is behind RateLimitFilter
                // yet (that filter only covers /login and /register today);
                // see Handoff.md for that flagged gap.
                .requestMatchers("/api/auth/forgot-password", "/api/auth/reset-password").permitAll()
                // Public designer-portfolio view — GET /api/users/{id}/designs — no
                // auth needed to browse a designer's published work.
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/*/designs").permitAll()
                // Public lab directory — GET /api/labs, GET /api/labs/{id}. POST/PATCH
                // still require authentication (and ADMIN, via @PreAuthorize).
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/labs", "/api/labs/**").permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(jwtAuthEntryPoint)
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authenticationProvider(authenticationProvider)
            // Correct order: RateLimitFilter runs first (before JWT parsing
            // overhead is incurred), then JwtAuthFilter. Previously both were
            // anchored to UsernamePasswordAuthenticationFilter — the last
            // addFilterBefore wins the ordering race, so jwtAuthFilter was
            // silently executing first. Anchoring jwtAuthFilter to
            // RateLimitFilter makes the order explicit and stable.
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, RateLimitFilter.class);

        return http.build();
    }

    /**
     * Didn't exist at all before — there was no CORS config anywhere in the
     * app. This only actually matters for browser-based access (e.g.
     * `expo start --web`); native Android/iOS via Expo Go or a built app
     * doesn't send an Origin header and isn't subject to CORS, so it was
     * never blocking mobile testing. Allowed origins come from
     * app.cors.allowed-origins (application.properties) rather than a
     * wildcard, since a wildcard origin is the actual security risk CORS
     * misconfiguration usually means.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") String allowedOrigins) {

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        // No cookies/session credentials are used — auth is a Bearer token
        // in the Authorization header — so this can stay false. That also
        // means we're not stuck choosing between a wildcard origin and
        // credentials (a wildcard + credentials=true is invalid per the
        // CORS spec anyway, and would be the actual vulnerability here).
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}