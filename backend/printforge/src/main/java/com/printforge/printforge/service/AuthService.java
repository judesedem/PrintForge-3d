package com.printforge.printforge.service;

import com.printforge.printforge.exception.EmailAlreadyExistsException;
import com.printforge.printforge.exception.InvalidCredentialsException;
import org.springframework.security.authentication.BadCredentialsException;
import com.printforge.printforge.dto.AuthResponse;
import com.printforge.printforge.dto.LoginRequest;
import com.printforge.printforge.dto.RegisterRequest;
import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Email already registered");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .build();

        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(savedUser.getEmail());

        return AuthResponse.builder()
                .message("Registration successful")
                .email(savedUser.getEmail())
                .role(savedUser.getRole().name())
                .token(token)
                .build();
    }

    public AuthResponse login(LoginRequest request) {

        try {
    authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                    request.getEmail(),
                    request.getPassword()
            )
    );
} catch (BadCredentialsException e) {
    throw new InvalidCredentialsException("Invalid email or password");
}

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        String token = jwtService.generateToken(user.getEmail());

        return AuthResponse.builder()
                .message("Login successful")
                .email(user.getEmail())
                .role(user.getRole().name())
                .token(token)
                .build();
    }
}