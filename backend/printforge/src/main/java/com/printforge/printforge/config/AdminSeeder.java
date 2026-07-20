package com.printforge.printforge.config;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Bootstraps the first ADMIN account on startup. Self-registration only
 * allows STUDENT/DESIGNER (AuthService.resolveRole), and creating an ADMIN
 * via POST /api/admin/users itself requires an existing ADMIN — without
 * this seeder there is no way to create the very first one on a fresh
 * database.
 *
 * Runs on every startup but is idempotent: it does nothing once a user
 * with ADMIN_EMAIL exists, so it's safe to leave in place indefinitely.
 * ADMIN_PASSWORD has no fallback value — if it isn't set, seeding is
 * skipped entirely rather than creating an account with a known/guessable
 * default password.
 */
@Slf4j
@Component
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email}")
    private String adminEmail;

    @Value("${admin.password:}")
    private String adminPassword;

    @Value("${admin.name}")
    private String adminName;

    public AdminSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (adminPassword == null || adminPassword.isBlank()) {
            log.info("ADMIN_PASSWORD not set, skipping admin seed");
            return;
        }

        if (userRepository.existsByEmail(adminEmail)) {
            log.info("Admin account already exists, skipping seed");
            return;
        }

        User admin = User.builder()
                .fullName(adminName)
                .email(adminEmail)
                .password(passwordEncoder.encode(adminPassword))
                .role(Role.ADMIN)
                .build();

        userRepository.save(admin);
        log.info("Admin account seeded for {}", adminEmail);
    }
}
