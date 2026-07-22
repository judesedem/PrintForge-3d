package com.printforge.marketplace.controller;

import com.printforge.marketplace.dto.UserDto;
import com.printforge.marketplace.dto.UserStatsResponse;
import com.printforge.marketplace.entity.User;
import com.printforge.marketplace.marketplaceservice.model.DesignListing;
import com.printforge.marketplace.repository.UserRepository;
import com.printforge.marketplace.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Public-facing user profile data: designer portfolios, designer stats, and
 * the current user's own profile picture upload.
 *
 * POST /api/users/profile-picture → auth required (any role)
 * GET  /api/users/{id}/designs    → public, no auth (see SecurityConfig)
 * GET  /api/users/{id}/stats      → auth required
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    public UserController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @PostMapping(value = "/profile-picture", consumes = "multipart/form-data")
    public ResponseEntity<UserDto> uploadProfilePicture(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        Long callerId = currentUser(authentication).getUserId();
        UserDto updated = userService.updateProfilePicture(callerId, file);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/designs")
    public ResponseEntity<List<DesignListing>> getUserDesigns(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getPublishedDesignsForUser(id));
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<UserStatsResponse> getUserStats(
            @PathVariable Long id,
            Authentication authentication) {

        User caller = currentUser(authentication);
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return ResponseEntity.ok(userService.getUserStats(id, caller.getUserId(), isAdmin));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
