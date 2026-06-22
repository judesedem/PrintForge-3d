package com.printforge.printforge.service;

import com.printforge.printforge.dto.AuthResponse;
import com.printforge.printforge.dto.LoginRequest;
import com.printforge.printforge.dto.RegisterRequest;
import com.printforge.printforge.dto.UserDto;
import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.exception.EmailAlreadyExistsException;
import com.printforge.printforge.exception.InvalidCredentialsException;
import com.printforge.printforge.exception.InvalidRoleException;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
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

        Role role = resolveRole(request.getRole());

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(savedUser.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(toUserDto(savedUser))
                .build();
    }

    /**
     * Previously this method ignored request.getRole() entirely and every
     * registration hardcoded Role.STUDENT — there was no way to create a
     * LAB_STAFF or ADMIN account at all. Now it honors whatever role was
     * sent (defaulting to STUDENT if none was given), case-insensitively,
     * and rejects anything that isn't a real role with a clean 400 instead
     * of letting Role.valueOf() throw an unhandled IllegalArgumentException.
     *
     * NOTE: this means /api/auth/register currently lets anyone self-elevate
     * to ADMIN by just sending role=admin. That's intentional for now so a
     * first admin account can be bootstrapped, but it's worth locking down
     * once you have one: e.g. restrict this endpoint to STUDENT only, and
     * add a separate admin-only endpoint for creating LAB_STAFF/ADMIN users.
     */
    private Role resolveRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return Role.STUDENT;
        }
        try {
            return Role.valueOf(requestedRole.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRoleException(
                    "Invalid role '" + requestedRole + "'. Must be one of: STUDENT, LAB_STAFF, ADMIN.");
        }
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
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        String token = jwtService.generateToken(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(toUserDto(user))
                .build();
    }

    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return toUserDto(user);
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .user_id(user.getUserId())
                .full_name(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name().toLowerCase())
                .build();
    }
}