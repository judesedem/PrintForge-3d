package com.printforge.admin.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Was missing entirely before this — admin-service had HeaderAuthFilter but
 * no SecurityConfig wiring it in, no @EnableMethodSecurity, and no
 * SecurityFilterChain bean, so AdminController's @PreAuthorize annotations
 * were inert and Spring Boot's autoconfigured default security chain
 * (httpBasic/formLogin against a generated password) applied instead,
 * incompatible with the gateway's header-based auth. Same shape as every
 * other service's SecurityConfig (see order-service/marketplace-service/
 * payment-service/notification-service) — no permitAll routes here, unlike
 * order-service's payment-webhook exception, since every /api/admin/**
 * endpoint requires an authenticated caller.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final HeaderAuthFilter headerAuthFilter;

    public SecurityConfig(HeaderAuthFilter headerAuthFilter) {
        this.headerAuthFilter = headerAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(headerAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
