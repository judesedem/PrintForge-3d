package com.printforge.printforge.adminservice.controller;

import com.printforge.printforge.adminservice.service.AdminService;
import com.printforge.printforge.dto.AuthResponse;
import com.printforge.printforge.dto.RegisterRequest;
import com.printforge.printforge.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final AuthService authService;

    public AdminController(AdminService adminService, AuthService authService) {
        this.adminService = adminService;
        this.authService = authService;
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

}
