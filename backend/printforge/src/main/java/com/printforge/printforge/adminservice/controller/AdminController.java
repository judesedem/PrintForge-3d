package com.printforge.printforge.adminservice.controller;

import com.printforge.printforge.adminservice.dto.RevenueHistoryEntry;
import com.printforge.printforge.adminservice.dto.SuspendUserRequest;
import com.printforge.printforge.adminservice.service.AdminService;
import com.printforge.printforge.dto.AuthResponse;
import com.printforge.printforge.dto.RegisterRequest;
import com.printforge.printforge.dto.UserDto;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.materialservice.dto.UpdateMaterialRequest;
import com.printforge.printforge.materialservice.model.Material;
import com.printforge.printforge.materialservice.service.MaterialService;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.service.AuthService;
import jakarta.validation.Valid;
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
    private final AuthService authService;
    private final UserRepository userRepository;
    private final MaterialService materialService;

    public AdminController(AdminService adminService, AuthService authService, UserRepository userRepository,
                            MaterialService materialService) {
        this.adminService = adminService;
        this.authService = authService;
        this.userRepository = userRepository;
        this.materialService = materialService;
    }

    /**
     * ADMIN only — create a user with any role including LAB_STAFF and ADMIN.
     * This is the only way to bootstrap privileged accounts now that
     * /api/auth/register is restricted to STUDENT and DESIGNER.
     *
     * First-time setup: temporarily allow ADMIN self-registration once to
     * create the first admin account, then lock it back down.
     */
    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponse> createUser(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.createUserAsAdmin(request));
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
            @RequestParam(required = false, defaultValue = "7") int days) {
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
     * ADMIN only — suspend/unsuspend a user account (#68). Takes effect
     * immediately: JwtAuthFilter rejects that user's very next request with
     * an already-issued token, it doesn't wait for a fresh login.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/users/{id}/suspend")
    public ResponseEntity<UserDto> suspendUser(
            @PathVariable Long id,
            @Valid @RequestBody SuspendUserRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(adminService.suspendUser(
                id, request.isSuspended(), request.getReason(), currentUser(authentication)));
    }

    /**
     * ADMIN only — updates cost_per_gram/colors/availability_status for a
     * material (see MaterialService.updateMaterial()'s javadoc). Writes to
     * the same `materials` table EstimateService's cost calculation and
     * GET /api/materials both read, so the change is live immediately —
     * no second hardcoded copy left stale anywhere.
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

}
