package com.printforge.printforge.printerservice.service;

import com.printforge.printforge.printerservice.exception.DuplicatePrinterException;
import com.printforge.printforge.printerservice.exception.InvalidPrinterStatusException;
import com.printforge.printforge.printerservice.exception.PrinterNotFoundException;
import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.repository.PrinterRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class PrinterService {

    private static final Set<String> VALID_STATUSES = Set.of("AVAILABLE", "BUSY", "OFFLINE", "MAINTENANCE");

    private final PrinterRepository printerRepository;

    public PrinterService(PrinterRepository printerRepository) {
        this.printerRepository = printerRepository;
    }

    public Printer registerPrinter(String printerName, String labLocation) {
        if (printerRepository.existsByPrinterName(printerName)) {
            throw new DuplicatePrinterException("A printer named '" + printerName + "' already exists");
        }
        Printer printer = new Printer();
        printer.setPrinterName(printerName);
        printer.setLabLocation(labLocation);
        printer.setStatus("AVAILABLE");
        return printerRepository.save(printer);
    }

    public List<Printer> getAllPrinters() {
        return printerRepository.findAll();
    }

    /** Backs the public GET /api/printers/available endpoint — anyone logged in can see this, not just staff. */
    public List<Printer> getAvailablePrinters() {
        return printerRepository.findByStatus("AVAILABLE");
    }

    public Printer getPrinterById(Long id) {
        return printerRepository.findById(id)
                .orElseThrow(() -> new PrinterNotFoundException(id));
    }

    /** Used by Queue Service to validate a printerId against a real, registered printer. */
    public Printer getPrinterByName(String printerName) {
        return printerRepository.findByPrinterName(printerName)
                .orElseThrow(() -> new PrinterNotFoundException(printerName));
    }

    public boolean printerExists(String printerName) {
        return printerRepository.existsByPrinterName(printerName);
    }

    public Printer updatePrinterStatus(Long id, String newStatus) {
        Printer printer = getPrinterById(id);

        String normalized = newStatus == null ? "" : newStatus.trim().toUpperCase();
        if (!VALID_STATUSES.contains(normalized)) {
            throw new InvalidPrinterStatusException(
                    "Invalid status '" + newStatus + "'. Must be one of: " + VALID_STATUSES);
        }
        printer.setStatus(normalized);
        return printerRepository.save(printer);
    }
}
