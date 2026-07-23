package com.printforge.admin.adminservice.controller;

<<<<<<< HEAD
import com.printforge.admin.adminservice.dto.RevenueHistoryEntry;
import com.printforge.admin.adminservice.dto.SuspendUserRequest;
=======
>>>>>>> b2baa6d320c0e949de10a0a04f3c104364ffcb93
import com.printforge.admin.adminservice.service.AdminService;
import com.printforge.admin.dto.UserDto;
import com.printforge.admin.entity.User;
import com.printforge.admin.marketplaceservice.model.DesignListing;
<<<<<<< HEAD
import com.printforge.admin.materialservice.dto.UpdateMaterialRequest;
import com.printforge.admin.materialservice.model.Material;
import com.printforge.admin.materialservice.service.MaterialService;
import com.printforge.admin.repository.UserRepository;
import jakarta.validation.Valid;
=======
import com.printforge.admin.repository.UserRepository;
>>>>>>> b2baa6d320c0e949de10a0a04f3c104364ffcb93
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
    private final MaterialService materialService;

    public AdminController(AdminService adminService, UserRepository userRepository,
                            MaterialService materialService) {
        this.adminService = adminService;
        this.userRepository = userRepository;
        this.materialService = materialService;
    }



    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboardSummary());
    }

    /**
     * ADMIN only — completed-payment revenue for a chart, one point per
     * calendar day over the last `days` days (default 7, clamped to
     * [1, 90] in AdminService). Stricter than the plain dashboard summary
     * above, which any LAB_STAFF can see.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/dashboard/revenue-history")
    public ResponseEntity<List<RevenueHistoryEntry>> getRevenueHistory(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(adminService.getRevenueHistory(days));
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



    /**
     * ADMIN only — updates cost_per_gram/colors/availability_status for a
     * material (see MaterialService.updateMaterial()'s javadoc). Writes to
     * the same `materials` table order-service's and marketplace-service's
     * EstimateService cost calculations and GET /api/materials all read,
     * so the change is live immediately — no second hardcoded copy left
     * stale anywhere.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/materials/{name}")
    public ResponseEntity<Material> updateMaterial(
            @PathVariable String name,
            @RequestBody UpdateMaterialRequest request) {
        return ResponseEntity.ok(materialService.updateMaterial(name, request));
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
