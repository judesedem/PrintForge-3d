package com.printforge.auth.service;

import com.printforge.auth.dto.AuthResponse;
import com.printforge.auth.dto.LoginRequest;
import com.printforge.auth.dto.RegisterRequest;
import com.printforge.auth.dto.UpdateProfileRequest;
import com.printforge.auth.dto.UserDto;
import com.printforge.auth.emailservice.service.EmailService;
import com.printforge.auth.entity.PasswordResetToken;
import com.printforge.auth.entity.Role;
import com.printforge.auth.entity.User;
import com.printforge.auth.exception.EmailAlreadyExistsException;
import com.printforge.auth.exception.InvalidCredentialsException;
import com.printforge.auth.exception.InvalidPasswordResetTokenException;
import com.printforge.auth.exception.InvalidProfileInputException;
import com.printforge.auth.exception.InvalidRoleException;
import com.printforge.auth.repository.PasswordResetTokenRepository;
import com.printforge.auth.repository.UserRepository;
import com.printforge.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int RESET_TOKEN_EXPIRY_MINUTES = 30;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;

    @Value("${app.frontend.reset-password-url}")
    private String frontendResetPasswordUrl;

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

        String token = jwtService.generateToken(savedUser.getEmail(), savedUser.getRole().name());

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
        String token = jwtService.generateToken(savedUser.getEmail(), savedUser.getRole().name());
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

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());

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
     * Self-service upgrade for POST /api/auth/upgrade-to-designer.
     * Idempotent for a caller who is already DESIGNER — returns 200 with
     * no change and no error, so a client that double-submits (or calls
     * this speculatively to check state) never sees a spurious failure.
     * LAB_STAFF/ADMIN callers are still rejected: role is a single enum
     * field here, not an additive collection, so "upgrading" a staff/admin
     * account would actually *replace* their elevated role with DESIGNER —
     * a silent privilege downgrade, not an upgrade. Only STUDENT is a safe
     * starting point for a real replacement.
     */
    public UserDto upgradeToDesigner(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (user.getRole() == Role.DESIGNER) {
            return toUserDto(user);
        }

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

        // Frontend flow: POST /api/files/upload/image → get URL →
        // PATCH /api/auth/profile with { profilePictureUrl: url }
        if (request.getProfilePictureUrl() != null) {
            String url = request.getProfilePictureUrl().trim();
            if (url.isEmpty()) {
                throw new InvalidProfileInputException("Profile picture URL cannot be blank");
            }
            user.setProfilePictureUrl(url);
        }

        if (request.getPhone() != null) {
            String phone = request.getPhone().trim();
            // Allow empty string to clear the phone number
            user.setPhone(phone.isEmpty() ? null : phone);
        }

        if (request.getBio() != null) {
            String bio = request.getBio().trim();
            if (bio.length() > 200) {
                throw new InvalidProfileInputException("Bio must be 200 characters or fewer");
            }
            // Allow empty string to clear the bio
            user.setBio(bio.isEmpty() ? null : bio);
        }

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved.getEmail(), saved.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .user(toUserDto(saved))
                .build();
    }

    /**
     * POST /api/auth/forgot-password. Always completes silently whether or
     * not the email is registered — the controller returns the same 200 +
     * generic message either way, so this method never throws for "user
     * not found." Invalidates any previous unused token for the user
     * before issuing a new one, so an old reset link stops working the
     * moment a fresh one is requested.
     */
    public void forgotPassword(String email) {
        Optional<User> maybeUser = userRepository.findByEmail(email);
        if (maybeUser.isEmpty()) {
            return;
        }
        User user = maybeUser.get();

        List<PasswordResetToken> previousTokens =
                passwordResetTokenRepository.findByUserIdAndUsedFalse(user.getUserId());
        previousTokens.forEach(t -> t.setUsed(true));
        passwordResetTokenRepository.saveAll(previousTokens);

        String token = UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUserId(user.getUserId());
        resetToken.setToken(token);
        resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
        resetToken.setUsed(false);
        passwordResetTokenRepository.save(resetToken);

        Map<String, String> templateVars = new LinkedHashMap<>();
        templateVars.put("fullName", user.getFullName());
        templateVars.put("resetLink", frontendResetPasswordUrl + "?token=" + token);
        templateVars.put("expiryMinutes", String.valueOf(RESET_TOKEN_EXPIRY_MINUTES));

        // Best-effort — same pattern as FileStorageService.deleteImage():
        // an email-provider failure here must never surface as anything
        // other than the controller's generic 200. Letting it propagate
        // would turn "the send failed" into a distinguishable response
        // from "no account exists," reopening exactly the enumeration gap
        // this endpoint's uniform-response design exists to close.
        try {
            emailService.sendTemplatedEmail(
                    user.getEmail(), "Reset your password", "password-reset", templateVars);
        } catch (Exception e) {
            // swallowed intentionally — see comment above
        }
    }

    /**
     * POST /api/auth/reset-password. Rejects with
     * InvalidPasswordResetTokenException (400) if the token is unknown,
     * already used, or expired — same generic message for all three, so
     * the response never tells a caller which case applied.
     */
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .filter(t -> !t.isUsed())
                .filter(t -> t.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new InvalidPasswordResetTokenException("Invalid or expired reset link"));

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .user_id(user.getUserId())
                .full_name(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name().toLowerCase())
                .profile_picture_url(user.getProfilePictureUrl())
<<<<<<< HEAD
                .phone(user.getPhone())
                .bio(user.getBio())
=======
                .is_premium(user.isPremium())
>>>>>>> b2baa6d320c0e949de10a0a04f3c104364ffcb93
                .build();
    }
}