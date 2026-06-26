package com.printforge.printforge.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.repository.JobServicePrintJobRepository;

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

    public PrintJob getPrintJobById(Long id) {
        return printJobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Print job not found with id: " + id));
    }

    public PrintJob updatePrintJob(Long id, PrintJob updatedJob) {
        PrintJob existingJob = getPrintJobById(id);

        if (updatedJob.getFileId() != null) {
            existingJob.setFileId(updatedJob.getFileId());
        }

        if (updatedJob.getEstimateId() != null) {
            existingJob.setEstimateId(updatedJob.getEstimateId());
        }

        if (updatedJob.getUserId() != null) {
            existingJob.setUserId(updatedJob.getUserId());
        }

        if (updatedJob.getMaterial() != null) {
            existingJob.setMaterial(updatedJob.getMaterial());
        }

        if (updatedJob.getColor() != null) {
            existingJob.setColor(updatedJob.getColor());
        }

        if (updatedJob.getQuantity() != null) {
            existingJob.setQuantity(updatedJob.getQuantity());
        }

        if (updatedJob.getInfill() != null) {
            existingJob.setInfill(updatedJob.getInfill());
        }

        if (updatedJob.getQuality() != null) {
            existingJob.setQuality(updatedJob.getQuality());
        }

        if (updatedJob.getNotes() != null) {
            existingJob.setNotes(updatedJob.getNotes());
        }

        if (updatedJob.getStatus() != null) {
            existingJob.setStatus(updatedJob.getStatus());
        }

        if (updatedJob.getAssignedPrinter() != null) {
            existingJob.setAssignedPrinter(updatedJob.getAssignedPrinter());
        }

        if (updatedJob.getOperatorNotes() != null) {
            existingJob.setOperatorNotes(updatedJob.getOperatorNotes());
        }

        if (updatedJob.getShippingTrackingNumber() != null) {
            existingJob.setShippingTrackingNumber(updatedJob.getShippingTrackingNumber());
        }

        return printJobRepository.save(existingJob);
    }
}