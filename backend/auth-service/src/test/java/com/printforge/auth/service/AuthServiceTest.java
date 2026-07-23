package com.printforge.auth.service;

import com.printforge.auth.dto.AuthResponse;
import com.printforge.auth.dto.RegisterRequest;
import com.printforge.auth.dto.UpdateProfileRequest;
import com.printforge.auth.emailservice.service.EmailService;
import com.printforge.auth.entity.Role;
import com.printforge.auth.entity.User;
import com.printforge.auth.exception.InvalidProfileInputException;
import com.printforge.auth.exception.InvalidRoleException;
import com.printforge.auth.repository.PasswordResetTokenRepository;
import com.printforge.auth.repository.UserRepository;
import com.printforge.auth.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Ported from the old
 * backend/printforge monolith's AuthServiceTest as part of the
 * microservices migration — same coverage, package names and JwtService's
 * generateToken(email, role) 2-arg signature updated for this service.
 *
 * Run with: ./mvnw test -pl auth-service -Dtest=AuthServiceTest
 */
class AuthServiceTest {

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    JwtService jwtService;
    AuthenticationManager authenticationManager;
    PasswordResetTokenRepository passwordResetTokenRepository;
    EmailService emailService;
    AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        passwordEncoder = Mockito.mock(PasswordEncoder.class);
        jwtService = Mockito.mock(JwtService.class);
        authenticationManager = Mockito.mock(AuthenticationManager.class);
        passwordResetTokenRepository = Mockito.mock(PasswordResetTokenRepository.class);
        emailService = Mockito.mock(EmailService.class);
        authService = new AuthService(userRepository, passwordEncoder, jwtService, authenticationManager,
                passwordResetTokenRepository, emailService);

        Mockito.when(passwordEncoder.encode(Mockito.any())).thenReturn("hashed");
        Mockito.when(jwtService.generateToken(Mockito.any(), Mockito.any())).thenReturn("fake-token");
        // Echo back whatever User entity is passed to save(), as if it got an id from the DB.
        Mockito.when(userRepository.save(Mockito.any(User.class)))
                .thenAnswer(inv -> {
                    User u = inv.getArgument(0);
                    u.setUserId(1L);
                    return u;
                });
    }

    private RegisterRequest requestWithRole(String role) {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("Test User");
        req.setEmail("test@knust.edu.gh");
        req.setPassword("password123");
        req.setRole(role);
        return req;
    }

    @Test
    void registeringWithAdminRoleActuallyCreatesAnAdmin() {
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);

        AuthResponse response = authService.register(requestWithRole("admin"));

        Mockito.verify(userRepository).save(savedUser.capture());
        assertEquals(Role.ADMIN, savedUser.getValue().getRole());
        assertEquals("admin", response.getUser().getRole());
    }

    @Test
    void registeringWithLabStaffRoleIsCaseInsensitive() {
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);

        authService.register(requestWithRole("LAB_STAFF"));

        Mockito.verify(userRepository).save(savedUser.capture());
        assertEquals(Role.LAB_STAFF, savedUser.getValue().getRole());
    }

    @Test
    void missingRoleDefaultsToStudent() {
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);

        authService.register(requestWithRole(null));

        Mockito.verify(userRepository).save(savedUser.capture());
        assertEquals(Role.STUDENT, savedUser.getValue().getRole());
    }

    @Test
    void garbageRoleIsRejectedInsteadOfSilentlyDefaulting() {
        assertThrows(InvalidRoleException.class, () -> authService.register(requestWithRole("doctor")));
        Mockito.verify(userRepository, Mockito.never()).save(Mockito.any());
    }

    private User userWithRole(Role role) {
        User user = User.builder()
                .userId(1L)
                .fullName("Test User")
                .email("test@knust.edu.gh")
                .password("hashed")
                .role(role)
                .build();
        return user;
    }

    @Test
    void upgradingAStudentGrantsTheDesignerRole() {
        User student = userWithRole(Role.STUDENT);
        Mockito.when(userRepository.findByEmail("test@knust.edu.gh")).thenReturn(java.util.Optional.of(student));
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);

        var response = authService.upgradeToDesigner("test@knust.edu.gh");

        Mockito.verify(userRepository).save(savedUser.capture());
        assertEquals(Role.DESIGNER, savedUser.getValue().getRole());
        assertEquals("designer", response.getRole());
    }

    @Test
    void upgradingAnAlreadyDesignerUserIsIdempotent() {
        User designer = userWithRole(Role.DESIGNER);
        Mockito.when(userRepository.findByEmail("test@knust.edu.gh")).thenReturn(java.util.Optional.of(designer));

        var response = authService.upgradeToDesigner("test@knust.edu.gh");

        assertEquals("designer", response.getRole());
        // No-op: save() is never called since nothing changed.
        Mockito.verify(userRepository, Mockito.never()).save(Mockito.any());
    }

    @Test
    void upgradingALabStaffAccountIsRejected() {
        User labStaff = userWithRole(Role.LAB_STAFF);
        Mockito.when(userRepository.findByEmail("test@knust.edu.gh")).thenReturn(java.util.Optional.of(labStaff));

        assertThrows(InvalidRoleException.class, () -> authService.upgradeToDesigner("test@knust.edu.gh"));
        Mockito.verify(userRepository, Mockito.never()).save(Mockito.any());
    }

    @Test
    void updatingProfilePictureUrlIsReflectedInTheAuthResponse() {
        User user = userWithRole(Role.STUDENT);
        Mockito.when(userRepository.findByEmail("test@knust.edu.gh")).thenReturn(java.util.Optional.of(user));
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setProfilePictureUrl("https://res.cloudinary.com/demo/image/upload/printforge/images/avatar.jpg");

        AuthResponse response = authService.updateProfile("test@knust.edu.gh", request);

        assertEquals("https://res.cloudinary.com/demo/image/upload/printforge/images/avatar.jpg",
                response.getUser().getProfile_picture_url());
    }

    @Test
    void blankProfilePictureUrlIsRejected() {
        User user = userWithRole(Role.STUDENT);
        Mockito.when(userRepository.findByEmail("test@knust.edu.gh")).thenReturn(java.util.Optional.of(user));
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setProfilePictureUrl("   ");

        assertThrows(InvalidProfileInputException.class,
                () -> authService.updateProfile("test@knust.edu.gh", request));
        Mockito.verify(userRepository, Mockito.never()).save(Mockito.any());
    }

    @Test
    void updatingPhoneAndBioIsReflectedInTheAuthResponse() {
        User user = userWithRole(Role.STUDENT);
        Mockito.when(userRepository.findByEmail("test@knust.edu.gh")).thenReturn(java.util.Optional.of(user));
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setPhone("+233201234567");
        request.setBio("Engineering student at KNUST");

        AuthResponse response = authService.updateProfile("test@knust.edu.gh", request);

        assertEquals("+233201234567", response.getUser().getPhone());
        assertEquals("Engineering student at KNUST", response.getUser().getBio());
    }

    @Test
    void bioOver200CharactersIsRejected() {
        User user = userWithRole(Role.STUDENT);
        Mockito.when(userRepository.findByEmail("test@knust.edu.gh")).thenReturn(java.util.Optional.of(user));
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setBio("x".repeat(201));

        assertThrows(InvalidProfileInputException.class,
                () -> authService.updateProfile("test@knust.edu.gh", request));
        Mockito.verify(userRepository, Mockito.never()).save(Mockito.any());
    }

    @Test
    void emptyPhoneClearsIt() {
        User user = userWithRole(Role.STUDENT);
        user.setPhone("+233201234567");
        Mockito.when(userRepository.findByEmail("test@knust.edu.gh")).thenReturn(java.util.Optional.of(user));
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setPhone("");

        AuthResponse response = authService.updateProfile("test@knust.edu.gh", request);

        assertNull(response.getUser().getPhone());
    }

    @Test
    void emptyBioClearsIt() {
        User user = userWithRole(Role.STUDENT);
        user.setBio("Old bio");
        Mockito.when(userRepository.findByEmail("test@knust.edu.gh")).thenReturn(java.util.Optional.of(user));
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setBio("");

        AuthResponse response = authService.updateProfile("test@knust.edu.gh", request);

        assertNull(response.getUser().getBio());
    }
}
