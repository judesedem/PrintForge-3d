package com.printforge.gateway.repository;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Deliberately not a Spring Data JPA repository / entity — the gateway
 * doesn't own the users table (auth-service does) and needs exactly one
 * query, so a plain JdbcTemplate lookup avoids pulling in an ORM mapping
 * layer for a single column. Backs JwtAuthenticationFilter's live role
 * check: the JWT's role claim is forwarded as X-Auth-Role to every
 * downstream service, but a role can change after the token was issued
 * (see upgrade-to-designer), so the gateway re-reads the current role
 * from the DB on every authenticated request rather than trusting the
 * token's claim — the same "don't trust stale token state" principle
 * auth-service's own JwtAuthFilter already applies to `suspended`.
 */
@Component
public class UserRoleRepository {

    private final JdbcTemplate jdbcTemplate;

    public UserRoleRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Empty means no user row for this email — e.g. the account was deleted since the token was issued. */
    public Optional<String> findRoleByEmail(String email) {
        try {
            String role = jdbcTemplate.queryForObject(
                    "SELECT role FROM users WHERE email = ?", String.class, email);
            return Optional.ofNullable(role);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }
}
