package com.printforge.printforge.adminservice.service;

import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.repository.PrinterRepository;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final PrintJobRepository printJobRepository;
    private final PrinterRepository printerRepository;

    public AdminService(PrintJobRepository printJobRepository, PrinterRepository printerRepository) {
        this.printJobRepository = printJobRepository;
        this.printerRepository = printerRepository;
    }

    /**
     * Simple ops-oversight summary: how many jobs are sitting in each
     * status (queue depth, how many are actively printing, etc.) and how
     * many printers are in each state. Didn't exist at all before — this
     * is the "GET /api/admin/dashboard" the proposal calls for.
     */
    public Map<String, Object> getDashboardSummary() {
        List<PrintJob> allJobs = printJobRepository.findAll();
        Map<String, Long> jobsByStatus = allJobs.stream()
                .collect(Collectors.groupingBy(PrintJob::getStatus, Collectors.counting()));

        List<Printer> allPrinters = printerRepository.findAll();
        Map<String, Long> printersByStatus = allPrinters.stream()
                .collect(Collectors.groupingBy(Printer::getStatus, Collectors.counting()));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalJobs", (long) allJobs.size());
        summary.put("jobsByStatus", jobsByStatus);
        summary.put("totalPrinters", (long) allPrinters.size());
        summary.put("printersByStatus", printersByStatus);
        return summary;
    }
}
