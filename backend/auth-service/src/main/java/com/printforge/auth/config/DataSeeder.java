package com.printforge.auth.config;

import com.printforge.auth.entity.Role;
import com.printforge.auth.entity.User;
import com.printforge.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email:admin@printforge.com}")
    private String adminEmail;

    @Value("${admin.password:secure_admin_password}")
    private String adminPassword;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setFullName("System Admin");
            admin.setRole(Role.ADMIN);
            admin.setEmailVerified(true);
            admin.setEmailOptIn(false);
            userRepository.save(admin);
            System.out.println("Seeded admin user: " + adminEmail);
        }
        
        // Let's also seed a LAB_STAFF user so you can test the new board!
        String staffEmail = "staff@printforge.com";
        if (!userRepository.existsByEmail(staffEmail)) {
            User staff = new User();
            staff.setEmail(staffEmail);
            staff.setPassword(passwordEncoder.encode("staff123"));
            staff.setFullName("Lab Technician");
            staff.setRole(Role.LAB_STAFF);
            staff.setEmailVerified(true);
            staff.setEmailOptIn(false);
            userRepository.save(staff);
            System.out.println("Seeded staff user: " + staffEmail);
        }
    }
}
