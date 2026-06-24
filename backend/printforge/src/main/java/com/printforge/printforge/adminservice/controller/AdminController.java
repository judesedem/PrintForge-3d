package com.printforge.printforge.adminservice.controller;

import com.printforge.printforge.adminservice.service.AdminService;
import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.service.PrinterService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Matches the proposal's Admin Service: GET /api/admin/dashboard,
 * GET /api/admin/printers, PUT /api/admin/printers/{id}/status. Didn't
 * exist at all before this — there was no Printer entity, no way to list
 * what printers exist, and Queue Service let staff type any free-text
 * string into a job's assigned printer with no validation at all.
 *
 * One addition beyond the original contract: POST /api/admin/printers,
 * to actually register a printer in the first place — the contract
 * doc lists endpoints for reading/updating printers but never creating
 * one, which would leave this list permanently empty otherwise.
 *
 * Class-level @PreAuthorize — every endpoint here is LAB_STAFF/ADMIN only.
 * Compare to GET /api/printers/available (PrinterController), which is
 * deliberately open to any authenticated user.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final PrinterService printerService;

    public AdminController(AdminService adminService, PrinterService printerService) {
        this.adminService = adminService;
        this.printerService = printerService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboardSummary());
    }

    @GetMapping("/printers")
    public ResponseEntity<List<Printer>> listAllPrinters() {
        return ResponseEntity.ok(printerService.getAllPrinters());
    }

    @PostMapping("/printers")
    public ResponseEntity<Printer> registerPrinter(
            @RequestParam String printerName,
            @RequestParam(required = false) String labLocation) {
        return ResponseEntity.ok(printerService.registerPrinter(printerName, labLocation));
    }

    @PutMapping("/printers/{id}/status")
    public ResponseEntity<Printer> updatePrinterStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(printerService.updatePrinterStatus(id, status));
    }

    @DeleteMapping("/printers/{id}")
    public ResponseEntity<Void> deletePrinter(@PathVariable Long id) {
        printerService.deletePrinter(id);
        return ResponseEntity.noContent().build();
    }
}
