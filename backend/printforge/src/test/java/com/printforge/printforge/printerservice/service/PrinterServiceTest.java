package com.printforge.printforge.printerservice.service;

import com.printforge.printforge.printerservice.exception.DuplicatePrinterException;
import com.printforge.printforge.printerservice.exception.InvalidPrinterStatusException;
import com.printforge.printforge.printerservice.exception.PrinterNotFoundException;
import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.repository.PrinterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB.
 * Run with: ./mvnw test -Dtest=PrinterServiceTest
 */
class PrinterServiceTest {

    PrinterRepository printerRepository;
    PrinterService service;

    @BeforeEach
    void setUp() {
        printerRepository = Mockito.mock(PrinterRepository.class);
        service = new PrinterService(printerRepository);

        Mockito.when(printerRepository.save(Mockito.any(Printer.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void registeringANewPrinterDefaultsToAvailable() {
        Mockito.when(printerRepository.existsByPrinterName("Prusa-01")).thenReturn(false);

        Printer printer = service.registerPrinter("Prusa-01", "Lab A");

        assertEquals("Prusa-01", printer.getPrinterName());
        assertEquals("AVAILABLE", printer.getStatus());
        assertEquals("Lab A", printer.getLabLocation());
    }

    @Test
    void registeringADuplicateNameIsRejected() {
        Mockito.when(printerRepository.existsByPrinterName("Prusa-01")).thenReturn(true);

        assertThrows(DuplicatePrinterException.class,
                () -> service.registerPrinter("Prusa-01", "Lab A"));
    }

    @Test
    void updatingToAnUnrecognizedStatusIsRejected() {
        Printer existing = new Printer();
        existing.setId(1L);
        existing.setPrinterName("Prusa-01");
        existing.setStatus("AVAILABLE");
        Mockito.when(printerRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThrows(InvalidPrinterStatusException.class,
                () -> service.updatePrinterStatus(1L, "on_fire"));
    }

    @Test
    void updatingToAValidStatusIsCaseInsensitive() {
        Printer existing = new Printer();
        existing.setId(1L);
        existing.setPrinterName("Prusa-01");
        existing.setStatus("AVAILABLE");
        Mockito.when(printerRepository.findById(1L)).thenReturn(Optional.of(existing));

        Printer updated = service.updatePrinterStatus(1L, "busy");

        assertEquals("BUSY", updated.getStatus());
    }

    @Test
    void updatingAnUnknownPrinterThrowsNotFound() {
        Mockito.when(printerRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(PrinterNotFoundException.class,
                () -> service.updatePrinterStatus(404L, "AVAILABLE"));
    }

    @Test
    void deletingAnExistingPrinterSucceeds() {
        Mockito.when(printerRepository.existsById(1L)).thenReturn(true);

        service.deletePrinter(1L);

        Mockito.verify(printerRepository).deleteById(1L);
    }

    @Test
    void deletingAnUnknownPrinterThrowsNotFound() {
        Mockito.when(printerRepository.existsById(404L)).thenReturn(false);

        assertThrows(PrinterNotFoundException.class, () -> service.deletePrinter(404L));
        Mockito.verify(printerRepository, Mockito.never()).deleteById(Mockito.any());
    }
}
