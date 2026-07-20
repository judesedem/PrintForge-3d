package com.printforge.printforge.controller;

import com.printforge.printforge.dto.AuthResponse;
import com.printforge.printforge.dto.ForgotPasswordRequest;
import com.printforge.printforge.dto.LoginRequest;
import com.printforge.printforge.dto.RegisterRequest;
import com.printforge.printforge.dto.ResetPasswordRequest;
import com.printforge.printforge.dto.UpdateProfileRequest;
import com.printforge.printforge.dto.UserDto;
import com.printforge.printforge.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {

        UserDto response = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/profile")
    public ResponseEntity<AuthResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        AuthResponse response = authService.updateProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * Always 200 with the same generic message, whether or not the email
     * is registered — see AuthService.forgotPassword()'s javadoc. Public
     * endpoint (see SecurityConfig's permitAll list), same as /register
     * and /login — a user who forgot their password can't authenticate.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        authService.forgotPassword(request.getEmail());

        Map<String, String> response = new LinkedHashMap<>();
        response.put("message", "If an account exists, a reset link has been sent");
        return ResponseEntity.ok(response);
    }

    /** Public endpoint — see SecurityConfig's permitAll list. */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        authService.resetPassword(request.getToken(), request.getNewPassword());

        Map<String, String> response = new LinkedHashMap<>();
        response.put("message", "Password reset successful");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // Stateless JWT — nothing to invalidate server-side.
        // Client deletes its stored token; this endpoint just exists
        // so the frontend's logout call doesn't 404.
        return ResponseEntity.ok().build();
    }

    // Self-service STUDENT → DESIGNER upgrade. The JWT itself doesn't carry
    // the role (JwtAuthFilter re-resolves authorities from the DB on every
    // request via UserDetailsService), so the caller's very next request
    // is already authorized as DESIGNER — no re-login needed.
    @PostMapping("/upgrade-to-designer")
    public ResponseEntity<UserDto> upgradeToDesigner(
            @AuthenticationPrincipal UserDetails userDetails) {

        UserDto response = authService.upgradeToDesigner(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }
}