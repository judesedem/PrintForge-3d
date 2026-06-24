package com.printforge.printforge.printerservice.controller;

import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.service.PrinterService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Frontend calls /api/printers for everything — listing, creating,
 * updating status, deleting. The original controller only had
 * GET /api/printers/available. Full CRUD is added here; the admin
 * equivalents under /api/admin/printers still exist for backward compat.
 */
@RestController
@RequestMapping("/api/printers")
public class PrinterController {

    private final PrinterService printerService;

    public PrinterController(PrinterService printerService) {
        this.printerService = printerService;
    }

    // ── GET /api/printers ─────────────────────────────────────────────────────
    // Staff/admin see all printers. Students also see all so they know
    // which printer is handling their job.
    @GetMapping
    public ResponseEntity<List<Printer>> getAllPrinters() {
        return ResponseEntity.ok(printerService.getAllPrinters());
    }

    // ── GET /api/printers/available ───────────────────────────────────────────
    // Kept for backward compat — used by JobDetail approve panel.
    @GetMapping("/available")
    public ResponseEntity<List<Printer>> getAvailablePrinters() {
        return ResponseEntity.ok(printerService.getAvailablePrinters());
    }

    // ── GET /api/printers/:id ─────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Printer> getPrinter(@PathVariable Long id) {
        return ResponseEntity.ok(printerService.getPrinterById(id));
    }

    // ── POST /api/printers ────────────────────────────────────────────────────
    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PostMapping
    public ResponseEntity<Printer> createPrinter(@RequestBody Map<String, String> body) {
        String name = body.get("printer_name");
        String location = body.get("lab_location");
        return ResponseEntity.ok(printerService.registerPrinter(name, location));
    }

    // ── PATCH /api/printers/:id/status ───────────────────────────────────────
    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<Printer> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        // Frontend sends { printer_status: "idle" } — map to backend's uppercase
        String status = body.getOrDefault("printer_status", body.get("status"));
        if (status != null) status = status.toUpperCase();
        return ResponseEntity.ok(printerService.updatePrinterStatus(id, status));
    }

    // ── DELETE /api/printers/:id ──────────────────────────────────────────────
    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePrinter(@PathVariable Long id) {
        printerService.deletePrinter(id);
        return ResponseEntity.noContent().build();
    }
}
