package com.printforge.printforge.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.printforge.printforge.entity.JobStatus;
import com.printforge.printforge.entity.PrintJob;
import com.printforge.printforge.repository.PrintJobRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PrintJobService {

    private final PrintJobRepository printJobRepository;

    public PrintJob createPrintJob(PrintJob printJob) {
        if (printJob.getStatus() == null) {
            printJob.setStatus(JobStatus.SUBMITTED);
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

        if (updatedJob.getUserId() != null) {
            existingJob.setUserId(updatedJob.getUserId());
        }

        if (updatedJob.getFileId() != null) {
            existingJob.setFileId(updatedJob.getFileId());
        }

        if (updatedJob.getMaterialId() != null) {
            existingJob.setMaterialId(updatedJob.getMaterialId());
        }

        if (updatedJob.getQuantity() != null) {
            existingJob.setQuantity(updatedJob.getQuantity());
        }

        if (updatedJob.getStatus() != null) {
            existingJob.setStatus(updatedJob.getStatus());
        }

        return printJobRepository.save(existingJob);
    }
}