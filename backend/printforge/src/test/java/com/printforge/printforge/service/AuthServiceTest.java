package com.printforge.printforge.service;

import com.printforge.printforge.dto.AuthResponse;
import com.printforge.printforge.dto.RegisterRequest;
import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.exception.InvalidRoleException;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Proves register() actually
 * honors the requested role instead of hardcoding STUDENT — the bug that
 * meant no LAB_STAFF/ADMIN account could ever be created.
 *
 * Run with: ./mvnw test -Dtest=AuthServiceTest
 */
class AuthServiceTest {

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    JwtService jwtService;
    AuthenticationManager authenticationManager;
    AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        passwordEncoder = Mockito.mock(PasswordEncoder.class);
        jwtService = Mockito.mock(JwtService.class);
        authenticationManager = Mockito.mock(AuthenticationManager.class);
        authService = new AuthService(userRepository, passwordEncoder, jwtService, authenticationManager);

        Mockito.when(passwordEncoder.encode(Mockito.any())).thenReturn("hashed");
        Mockito.when(jwtService.generateToken(Mockito.any())).thenReturn("fake-token");
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
}
