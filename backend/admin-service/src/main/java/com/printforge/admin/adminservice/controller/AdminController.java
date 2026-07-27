package com.printforge.admin.adminservice.controller;

import com.printforge.admin.adminservice.service.AdminService;
import com.printforge.admin.dto.UserDto;
import com.printforge.admin.entity.User;
import com.printforge.admin.marketplaceservice.model.DesignListing;
import com.printforge.admin.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin Service — dashboard summary and privileged user creation.
 *
 * Printer management (previously duplicated here as /api/admin/printers)
 * has been consolidated into PrinterController (/api/printers), which is
 * the single authoritative home for all printer CRUD. Those endpoints
 * already gate mutations behind LAB_STAFF/ADMIN, and PrinterController
 * additionally offers GET /{id} and proper JSON body conventions that the
 * old @RequestParam routes here lacked.
 *
 * Class-level @PreAuthorize — every remaining endpoint is LAB_STAFF/ADMIN only.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AdminController(AdminService adminService, UserRepository userRepository, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.adminService = adminService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDto> createUser(@RequestBody com.printforge.admin.dto.AdminCreateUserRequest request) {
        return ResponseEntity.ok(adminService.createUser(request, passwordEncoder));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboardSummary());
    }

    /**
     * ADMIN only — force-unpublish any listing regardless of owner (#67/
     * #68 takedown). Separate from MarketplaceController's designer-only
     * publish/unpublish endpoints, which are untouched.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/listings/{id}/unpublish")
    public ResponseEntity<DesignListing> unpublishListing(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(adminService.unpublishListing(id, currentUser(authentication)));
    }

    /**
     * ADMIN only — undo a force-unpublish. See AdminService.
     * republishListing()'s javadoc for the known limitation around
     * distinguishing an admin takedown from a designer's own independent
     * publish/unpublish choice made afterward.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/listings/{id}/republish")
    public ResponseEntity<DesignListing> republishListing(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(adminService.republishListing(id, currentUser(authentication)));
    }



    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @GetMapping("/users")
    public ResponseEntity<java.util.List<UserDto>> getUsers() {
        return ResponseEntity.ok(userRepository.findAll().stream()
                .map(user -> UserDto.builder()
                        .user_id(user.getUserId())
                        .full_name(user.getFullName())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .profile_picture_url(user.getProfilePictureUrl())
                        .suspended(user.getSuspended())
                        .build())
                .toList());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, Authentication authentication) {
        adminService.deleteUserCascade(id, currentUser(authentication));
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable Long id) {
        adminService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/jobs")
    public ResponseEntity<java.util.List<com.printforge.admin.queueservice.model.PrintJob>> getJobs() {
        return ResponseEntity.ok(((com.printforge.admin.queueservice.repository.PrintJobRepository) 
            org.springframework.web.context.support.WebApplicationContextUtils.getWebApplicationContext(
                ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.getRequestAttributes()).getRequest().getServletContext()
            ).getBean(com.printforge.admin.queueservice.repository.PrintJobRepository.class)).findAll());
    }
}
