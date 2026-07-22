package com.printforge.printer.repository;

import com.printforge.printer.model.Printer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrinterRepository extends JpaRepository<Printer, Long> {

    List<Printer> findByStatus(String status);

    Optional<Printer> findByPrinterName(String printerName);

    boolean existsByPrinterName(String printerName);
}
