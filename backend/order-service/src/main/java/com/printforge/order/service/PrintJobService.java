package com.printforge.order.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.printforge.order.dto.UpdateJobRequest;
import com.printforge.order.queueservice.model.PrintJob;
import com.printforge.order.repository.JobServicePrintJobRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PrintJobService {

    private final JobServicePrintJobRepository printJobRepository;

    public PrintJob createPrintJob(PrintJob printJob) {
        if (printJob.getStatus() == null) {
            printJob.setStatus("SUBMITTED");
        }

        return printJobRepository.save(printJob);
    }

    public List<PrintJob> getAllPrintJobs() {
        return printJobRepository.findAll();
    }

    public List<PrintJob> getJobsForUser(Long userId) {
        return printJobRepository.findByUserId(userId);
    }

    public PrintJob getPrintJobById(Long id) {
        return printJobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Print job not found with id: " + id));
    }

    // Caller-editable fields only — see UpdateJobRequest for why status,
    // assignedPrinter, operatorNotes, trackingNumber, estimateId, and userId
    // are excluded from this allowlist.
    public PrintJob updateJobFields(Long id, UpdateJobRequest request) {
        PrintJob existingJob = getPrintJobById(id);

        if (request.getNotes() != null) {
            existingJob.setNotes(request.getNotes());
        }

        if (request.getColor() != null) {
            existingJob.setColor(request.getColor());
        }

        return printJobRepository.save(existingJob);
    }
}