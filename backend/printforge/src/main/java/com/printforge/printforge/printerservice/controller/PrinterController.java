package com.printforge.printforge.printerservice.controller;

import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.service.PrinterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only, for any authenticated user — not staff-only. Knowing which
 * printers are currently AVAILABLE is useful for anyone tracking or about
 * to submit a job, not just lab staff. Full management (registering
 * printers, seeing OFFLINE/MAINTENANCE ones, changing status) lives under
 * /api/admin/printers instead, restricted to LAB_STAFF/ADMIN.
 */
@RestController
@RequestMapping("/api/printers")
public class PrinterController {

    private final PrinterService printerService;

    public PrinterController(PrinterService printerService) {
        this.printerService = printerService;
    }

    @GetMapping("/available")
    public ResponseEntity<List<Printer>> getAvailablePrinters() {
        return ResponseEntity.ok(printerService.getAvailablePrinters());
    }
}
