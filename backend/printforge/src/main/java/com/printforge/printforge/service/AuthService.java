package com.printforge.printforge.service;

import com.printforge.printforge.dto.LoginRequest;
import com.printforge.printforge.dto.AuthResponse;
import com.printforge.printforge.dto.RegisterRequest;
import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .build();

         User Saveduser=userRepository.save(user);

        return AuthResponse.builder()
                .message("Registration successful")
                .email(user.getEmail())
                .role(Saveduser.getRole().name())
                .build();
    }
    public AuthResponse login(LoginRequest request) {

    User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));

    if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
        throw new RuntimeException("Invalid email or password");
    }

    return AuthResponse.builder()
            .message("Login successful")
            .email(user.getEmail())
            .role(user.getRole().name())
            .build();
}
}