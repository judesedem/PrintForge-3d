package com.printforge.printforge.service;

import com.printforge.printforge.dto.AuthResponse;
import com.printforge.printforge.dto.LoginRequest;
import com.printforge.printforge.dto.RegisterRequest;
import com.printforge.printforge.dto.UpdateProfileRequest;
import com.printforge.printforge.dto.UserDto;
import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.exception.EmailAlreadyExistsException;
import com.printforge.printforge.exception.InvalidCredentialsException;
import com.printforge.printforge.exception.InvalidProfileInputException;
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
     * Self-registration is restricted to STUDENT and DESIGNER only.
     * LAB_STAFF and ADMIN accounts can only be created by an existing ADMIN
     * through POST /api/admin/users. This prevents anyone from self-elevating
     * to a privileged role through the public register endpoint.
     */
    private Role resolveRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return Role.STUDENT;
        }
        Role role;
        try {
            role = Role.valueOf(requestedRole.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRoleException(
                    "Invalid role '" + requestedRole + "'. Must be one of: STUDENT, DESIGNER.");
        }
        if (role == Role.LAB_STAFF || role == Role.ADMIN) {
            throw new InvalidRoleException(
                    "Role '" + role + "' cannot be self-assigned. Contact an administrator.");
        }
        return role;
    }

    /**
     * Called only by POST /api/admin/users (ADMIN role required).
     * Creates a user with any role including LAB_STAFF and ADMIN.
     */
    public AuthResponse createUserAsAdmin(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Email already registered");
        }
        Role role;
        try {
            role = request.getRole() == null || request.getRole().isBlank()
                    ? Role.STUDENT
                    : Role.valueOf(request.getRole().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRoleException(
                    "Invalid role '" + request.getRole() + "'. Must be one of: STUDENT, DESIGNER, LAB_STAFF, ADMIN.");
        }
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

        // #68 follow-up — checked only after credentials are confirmed
        // correct above, so this can't be used to probe whether an email
        // is registered/suspended without knowing the password. Reuses the
        // same exception type (and therefore the same 401 + ErrorResponse
        // shape) every other login failure in this method already throws,
        // per the task's explicit ask not to introduce a new response
        // shape or status convention here — just a message that actually
        // says what's wrong, matching JwtAuthFilter's suspended-check
        // wording from the moderation work rather than the generic
        // "invalid credentials" text.
        if (Boolean.TRUE.equals(user.getSuspended())) {
            throw new InvalidCredentialsException("Account suspended. Contact support.");
        }

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

    /**
     * Self-service upgrade for POST /api/auth/upgrade-to-designer. Only
     * valid from STUDENT — designers/staff/admins calling this again is
     * treated as a client error rather than a silent no-op, so the frontend
     * gets a clear signal instead of a misleadingly-"successful" response
     * that changed nothing.
     */
    public UserDto upgradeToDesigner(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (user.getRole() != Role.STUDENT) {
            throw new InvalidRoleException(
                    "Only student accounts can be upgraded to designer. Current role: "
                            + user.getRole().name().toLowerCase());
        }

        user.setRole(Role.DESIGNER);
        User saved = userRepository.save(user);
        return toUserDto(saved);
    }

    /**
     * PATCH /api/auth/profile. Always returns a fresh AuthResponse (token +
     * user) rather than conditionally shaping the response on whether email
     * changed — a harmless re-issued token when only fullName changes, but
     * a consistent response shape for the frontend either way. The email
     * itself IS the JWT subject (see JwtService/JwtAuthFilter), so a changed
     * email requires a new token — the old one would resolve to a user that
     * no longer exists under that email.
     */
    public AuthResponse updateProfile(String currentEmail, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (request.getFullName() != null) {
            String trimmed = request.getFullName().trim();
            if (trimmed.isEmpty()) {
                throw new InvalidProfileInputException("Full name cannot be blank");
            }
            if (trimmed.length() > 100) {
                throw new InvalidProfileInputException("Full name cannot exceed 100 characters");
            }
            user.setFullName(trimmed);
        }

        if (request.getEmail() != null) {
            String normalized = request.getEmail().trim().toLowerCase();
            if (normalized.isEmpty()) {
                throw new InvalidProfileInputException("Email cannot be blank");
            }
            if (!normalized.equals(user.getEmail()) && userRepository.existsByEmail(normalized)) {
                throw new EmailAlreadyExistsException("Email already registered");
            }
            user.setEmail(normalized);
        }

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(toUserDto(saved))
                .build();
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .user_id(user.getUserId())
                .full_name(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name().toLowerCase())
                .profile_picture_url(user.getProfilePictureUrl())
                .build();
    }
}