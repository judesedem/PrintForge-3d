package com.printforge.printforge.adminservice.service;

import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.repository.PrinterRepository;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import com.printforge.printforge.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final PrintJobRepository printJobRepository;
    private final PrinterRepository printerRepository;
    private final DesignListingRepository designListingRepository;
    private final UserRepository userRepository;

    public AdminService(PrintJobRepository printJobRepository,
                        PrinterRepository printerRepository,
                        DesignListingRepository designListingRepository,
                        UserRepository userRepository) {
        this.printJobRepository = printJobRepository;
        this.printerRepository = printerRepository;
        this.designListingRepository = designListingRepository;
        this.userRepository = userRepository;
    }

    public Map<String, Object> getDashboardSummary() {
        List<PrintJob> allJobs = printJobRepository.findAll();
        Map<String, Long> jobsByStatus = allJobs.stream()
                .collect(Collectors.groupingBy(PrintJob::getStatus, Collectors.counting()));

        List<Printer> allPrinters = printerRepository.findAll();
        Map<String, Long> printersByStatus = allPrinters.stream()
                .collect(Collectors.groupingBy(Printer::getStatus, Collectors.counting()));

        // Designer earnings summary: how much each designer is owed
        List<Object[]> rawEarnings = designListingRepository.sumEarningsByDesigner();
        List<Map<String, Object>> designerEarnings = rawEarnings.stream().map(row -> {
            Long designerId = ((Number) row[0]).longValue();
            Object totalOwed = row[1];
            Map<String, Object> entry = new LinkedHashMap<>();
            String designerName = userRepository.findById(designerId)
                    .map(u -> u.getFullName())
                    .orElse("Designer #" + designerId);
            entry.put("designer_name", designerName);
            entry.put("total_owed", totalOwed);
            return entry;
        }).toList();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalJobs", (long) allJobs.size());
        summary.put("jobsByStatus", jobsByStatus);
        summary.put("totalPrinters", (long) allPrinters.size());
        summary.put("printersByStatus", printersByStatus);
        summary.put("designer_earnings", designerEarnings);
        return summary;
    }
}
