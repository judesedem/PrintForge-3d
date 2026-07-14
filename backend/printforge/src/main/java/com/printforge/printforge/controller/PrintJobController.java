package com.printforge.printforge.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.service.PrintJobService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/job-service/print-jobs")
@RequiredArgsConstructor
public class PrintJobController {

    private final PrintJobService printJobService;

    @PostMapping
    public ResponseEntity<PrintJob> createPrintJob(@RequestBody PrintJob printJob) {
        return ResponseEntity.ok(printJobService.createPrintJob(printJob));
    }

    @GetMapping
    public ResponseEntity<List<PrintJob>> getAllPrintJobs() {
        return ResponseEntity.ok(printJobService.getAllPrintJobs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrintJob> getPrintJobById(@PathVariable Long id) {
        return ResponseEntity.ok(printJobService.getPrintJobById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrintJob> updatePrintJob(
            @PathVariable Long id,
            @RequestBody PrintJob printJob
    ) {
        return ResponseEntity.ok(printJobService.updatePrintJob(id, printJob));
    }
}