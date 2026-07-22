package com.printforge.printforge.settingsservice.controller;

import com.printforge.printforge.settingsservice.dto.UpdateContactInfoRequest;
import com.printforge.printforge.settingsservice.dto.UpdateFeatureToggleRequest;
import com.printforge.printforge.settingsservice.model.FeatureToggle;
import com.printforge.printforge.settingsservice.model.LabContactInfo;
import com.printforge.printforge.settingsservice.service.SettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin-editable platform settings: lab contact info and feature toggles.
 *
 * No class-level @PreAuthorize (unlike AdminController, which is
 * LAB_STAFF/ADMIN-only across the board) — the GET endpoints here need to
 * be readable by any authenticated user: contact info appears on
 * notifications/receipts, and other services need to read the feature
 * toggles too, not just admins/staff. They rely on SecurityConfig's
 * default `anyRequest().authenticated()`, same as NotificationController's
 * plain GETs. Only the PATCH (mutation) endpoints are locked to ADMIN.
 *
 * GET  /api/admin/settings/contact          → any authenticated user
 * PATCH /api/admin/settings/contact         → ADMIN only
 * GET  /api/admin/settings/features         → any authenticated user
 * PATCH /api/admin/settings/features/{key}  → ADMIN only
 */
@RestController
@RequestMapping("/api/admin/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/contact")
    public ResponseEntity<LabContactInfo> getContactInfo() {
        return ResponseEntity.ok(settingsService.getContactInfo());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/contact")
    public ResponseEntity<LabContactInfo> updateContactInfo(@RequestBody UpdateContactInfoRequest request) {
        return ResponseEntity.ok(settingsService.updateContactInfo(request));
    }

    @GetMapping("/features")
    public ResponseEntity<List<FeatureToggle>> getFeatureToggles() {
        return ResponseEntity.ok(settingsService.getFeatureToggles());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/features/{key}")
    public ResponseEntity<FeatureToggle> updateFeatureToggle(
            @PathVariable("key") String featureName,
            @RequestBody UpdateFeatureToggleRequest request) {
        return ResponseEntity.ok(settingsService.updateFeatureToggle(featureName, request.isEnabled()));
    }
}
