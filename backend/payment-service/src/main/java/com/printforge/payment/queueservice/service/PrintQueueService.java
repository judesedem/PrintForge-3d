package com.printforge.payment.queueservice.service;

import com.printforge.payment.estimateservice.exception.EstimateNotFoundException;
import com.printforge.payment.estimateservice.model.Estimate;
import com.printforge.payment.estimateservice.repository.EstimateRepository;
import com.printforge.payment.fileservice.exception.ModelFileNotFoundException;
import com.printforge.payment.fileservice.model.ModelFile;
import com.printforge.payment.fileservice.repository.ModelFileRepository;
import com.printforge.payment.labservice.model.LabLocation;
import com.printforge.payment.labservice.service.LabLocationService;
import com.printforge.payment.notificationservice.service.NotificationService;
import com.printforge.payment.queueservice.exception.InvalidJobStatusException;
import com.printforge.payment.queueservice.exception.PrintJobNotFoundException;
import com.printforge.payment.queueservice.model.PrintJob;
import com.printforge.payment.queueservice.repository.PrintJobRepository;
import com.printforge.payment.printerservice.exception.PrinterBusyException;
import com.printforge.payment.printerservice.exception.PrinterNotFoundException;
import com.printforge.payment.printerservice.model.Printer;
import com.printforge.payment.printerservice.repository.PrinterRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class PrintQueueService {

    private static final Set<String> VALID_STATUSES =
            Set.of("SUBMITTED", "APPROVED", "QUEUED", "PRINTING", "COMPLETED", "REJECTED");

    // Used only by transitionJobStatus() below (PATCH /api/print-jobs/{id}/transition).
    // READY and COLLECTED are new statuses that the older free-form
    // updateJobStatus()/VALID_STATUSES above deliberately doesn't know
    // about — this is a separate, stricter state machine layered on top,
    // not a replacement for it.
    private static final java.util.Map<String, String> REQUIRED_PREVIOUS_STATUS = java.util.Map.of(
            "PRINTING", "APPROVED",
            "READY", "PRINTING",
            "COLLECTED", "READY"
    );

    private final PrintJobRepository printJobRepository;
    private final ModelFileRepository modelFileRepository;
    private final EstimateRepository estimateRepository;
    private final PrinterRepository printerRepository;
    private final NotificationService notificationService;
    private final LabLocationService labLocationService;

    public PrintQueueService(PrintJobRepository printJobRepository,
                              ModelFileRepository modelFileRepository,
                              EstimateRepository estimateRepository,
                              PrinterRepository printerRepository,
                              NotificationService notificationService,
                              LabLocationService labLocationService) {
        this.printJobRepository = printJobRepository;
        this.modelFileRepository = modelFileRepository;
        this.estimateRepository = estimateRepository;
        this.printerRepository = printerRepository;
        this.notificationService = notificationService;
        this.labLocationService = labLocationService;
    }

    /**
     * Standard (BYOF) job creation — enforces that both the file and the
     * estimate belong to the calling user.
     */
    public PrintJob createPrintJob(Long fileId, Long estimateId, Long callerId) {
        return createPrintJob(fileId, estimateId, callerId,
                null, null, null, null, null, null, false);
    }

    /**
     * Full job creation used by the facade, with print parameters and a flag
     * to skip the file-ownership check for marketplace orders (where the file
     * belongs to the designer, not the customer).
     *
     * skipFileOwnershipCheck=true is only safe when the caller has already
     * verified the file comes from a PUBLISHED listing — never pass true from
     * a user-facing endpoint that accepts a raw fileId from the client.
     *
     * The estimate ownership check is always enforced regardless of the flag:
     * the estimate must belong to the calling user so a customer cannot attach
     * another user's cost calculation to their order.
     */
    public PrintJob createPrintJob(Long fileId, Long estimateId, Long callerId,
                                   String material, String color, Integer quantity,
                                   String infill, String quality, String notes,
                                   boolean skipFileOwnershipCheck) {

        ModelFile file = modelFileRepository.findById(fileId)
                .orElseThrow(() -> new ModelFileNotFoundException(fileId));

        if (!skipFileOwnershipCheck && !callerId.equals(file.getUserId())) {
            throw new AccessDeniedException("You can only create a print job using a file you uploaded yourself");
        }

        Estimate estimate = estimateRepository.findById(estimateId)
                .orElseThrow(() -> new EstimateNotFoundException(estimateId));
        if (!callerId.equals(estimate.getUserId())) {
            throw new AccessDeniedException("You can only create a print job using your own estimate");
        }

        PrintJob newJob = new PrintJob();
        newJob.setFileId(fileId);
        newJob.setEstimateId(estimateId);
        newJob.setUserId(callerId);
        newJob.setMaterial(material);
        newJob.setColor(color);
        newJob.setQuantity(quantity);
        newJob.setInfill(infill);
        newJob.setQuality(quality);
        newJob.setNotes(notes);
        return printJobRepository.save(newJob);
    }

    public PrintJob getJobById(Long jobId) {
        return printJobRepository.findById(jobId)
                .orElseThrow(() -> new PrintJobNotFoundException(jobId));
    }

    public List<PrintJob> getAllJobs() {
        return printJobRepository.findAll();
    }

    public List<PrintJob> getJobsByStatus(String status) {
        return printJobRepository.findByStatus(status.toUpperCase());
    }

    public List<PrintJob> getJobsForUser(Long userId, String status) {
        List<PrintJob> jobs = printJobRepository.findByUserId(userId);
        if (status == null || status.isBlank()) return jobs;
        String normalized = status.toUpperCase();
        return jobs.stream().filter(j -> normalized.equals(j.getStatus())).toList();
    }

    public PrintJob updateJobStatus(Long jobId, String newStatus, String printerId,
                                     String operatorNotes, String trackingNumber) {
        PrintJob job = printJobRepository.findById(jobId)
                .orElseThrow(() -> new PrintJobNotFoundException(jobId));

        String normalizedStatus = newStatus == null ? "" : newStatus.trim().toUpperCase();

        // READY/COLLECTED are the ordered, student-visible lifecycle steps
        // that belong exclusively to transitionJobStatus() (PATCH
        // .../transition) — that's the path enforcing APPROVED->PRINTING->
        // READY->COLLECTED order and firing the correct "Ready for Pickup"
        // notification (with lab location) on READY. This free-form
        // endpoint has no such ordering guard, so letting a status jump
        // straight here would silently skip READY and its notification
        // entirely. Rejected explicitly rather than just relying on
        // VALID_STATUSES not containing them, so staff get a clear pointer
        // to the right endpoint instead of a generic "invalid status".
        if ("READY".equals(normalizedStatus) || "COLLECTED".equals(normalizedStatus)) {
            throw new InvalidJobStatusException(
                    "Use PATCH /api/print-jobs/{id}/transition to advance to READY or COLLECTED.");
        }

        if (!VALID_STATUSES.contains(normalizedStatus)) {
            throw new InvalidJobStatusException(
                    "Invalid status '" + newStatus + "'. Must be one of: " + VALID_STATUSES);
        }
        job.setStatus(normalizedStatus);

        // Printer assignment with cascading status
        if (printerId != null && !printerId.isBlank()) {
            Printer newPrinter = printerRepository.findByPrinterName(printerId)
                    .orElseThrow(() -> new PrinterNotFoundException(printerId));

            boolean reassigningSamePrinter = printerId.equals(job.getAssignedPrinter());
            if (!reassigningSamePrinter && !"AVAILABLE".equals(newPrinter.getStatus())) {
                throw new PrinterBusyException(printerId, newPrinter.getStatus());
            }

            // Free old printer if reassigning
            String previousPrinter = job.getAssignedPrinter();
            if (previousPrinter != null && !previousPrinter.isBlank() &&
                    !previousPrinter.equals(printerId)) {
                printerRepository.findByPrinterName(previousPrinter).ifPresent(old -> {
                    old.setStatus("AVAILABLE");
                    printerRepository.save(old);
                });
            }

            newPrinter.setStatus("BUSY");
            printerRepository.save(newPrinter);
            job.setAssignedPrinter(printerId);
        }

        if (operatorNotes != null) job.setOperatorNotes(operatorNotes);
        if (trackingNumber != null) job.setShippingTrackingNumber(trackingNumber);

        // Timestamps and printer cleanup on terminal statuses
        if ("PRINTING".equals(normalizedStatus) && job.getStartedAt() == null) {
            job.setStartedAt(LocalDateTime.now());
        } else if ("COMPLETED".equals(normalizedStatus) || "REJECTED".equals(normalizedStatus)) {
            if (job.getCompletedAt() == null) job.setCompletedAt(LocalDateTime.now());
            String assignedPrinter = job.getAssignedPrinter();
            if (assignedPrinter != null && !assignedPrinter.isBlank()) {
                printerRepository.findByPrinterName(assignedPrinter).ifPresent(p -> {
                    p.setStatus("AVAILABLE");
                    printerRepository.save(p);
                });
            }
        }

        PrintJob saved = printJobRepository.save(job);

        // Auto-trigger notifications on key status changes (Phase 4 communication loop)
        switch (normalizedStatus) {
            case "PRINTING" -> notificationService.createNotification(
                    job.getUserId(),
                    "Print Started",
                    "Your print job has started printing!",
                    "info");
            case "COMPLETED" -> notificationService.createNotification(
                    job.getUserId(),
                    "Print Complete",
                    "Your print job is complete and ready for collection.",
                    "success");
            case "REJECTED" -> notificationService.createNotification(
                    job.getUserId(),
                    "Job Rejected",
                    "Your print job was rejected. Check operator notes.",
                    "error");
        }

        return saved;
    }

    /**
     * Strict staff-driven lifecycle used by PATCH /api/print-jobs/{id}/transition:
     * APPROVED → PRINTING → READY → COLLECTED only, one step at a time.
     * Deliberately separate from updateJobStatus() above (which stays
     * exactly as it was) rather than extending it, since updateJobStatus()
     * is unconditional (any VALID_STATUSES value from any current status)
     * and this needs to reject out-of-order jumps with a 400.
     */
    public PrintJob transitionJobStatus(Long jobId, String requestedStatus) {
        PrintJob job = printJobRepository.findById(jobId)
                .orElseThrow(() -> new PrintJobNotFoundException(jobId));

        String normalized = requestedStatus == null ? "" : requestedStatus.trim().toUpperCase();
        String requiredFrom = REQUIRED_PREVIOUS_STATUS.get(normalized);
        if (requiredFrom == null) {
            throw new InvalidJobStatusException(
                    "Invalid status '" + requestedStatus + "'. Must be one of: PRINTING, READY, COLLECTED.");
        }

        String currentStatus = job.getStatus();
        if (!requiredFrom.equals(currentStatus)) {
            throw new InvalidJobStatusException(
                    "Cannot transition from '" + currentStatus + "' to '" + normalized + "'. " +
                            "Valid transitions: APPROVED→PRINTING, PRINTING→READY, READY→COLLECTED.");
        }

        job.setStatus(normalized);
        if ("PRINTING".equals(normalized) && job.getStartedAt() == null) {
            job.setStartedAt(LocalDateTime.now());
        } else if ("COLLECTED".equals(normalized) && job.getCompletedAt() == null) {
            job.setCompletedAt(LocalDateTime.now());
        }

        PrintJob saved = printJobRepository.save(job);

        String jobName = modelFileRepository.findById(job.getFileId())
                .map(ModelFile::getFileName)
                .orElse("your print job");

        switch (normalized) {
            case "PRINTING" -> notificationService.createNotification(
                    job.getUserId(),
                    "Print Started",
                    "Your print job " + jobName + " has started printing!",
                    "info");
            case "READY" -> notificationService.createNotification(
                    job.getUserId(),
                    "Ready for Pickup",
                    readyForPickupMessage(job, jobName),
                    "success",
                    "printforge://jobs/" + job.getId());
            case "COLLECTED" -> notificationService.createNotification(
                    job.getUserId(),
                    "Collected",
                    "Thank you for collecting " + jobName + "!",
                    "success");
        }

        return saved;
    }

    private String readyForPickupMessage(PrintJob job, String jobName) {
        if (job.getLabLocationId() != null) {
            Optional<LabLocation> lab = labLocationService.findById(job.getLabLocationId());
            if (lab.isPresent()) {
                return "Your print job '" + jobName + "' is ready for pickup at "
                        + lab.get().getName() + ", " + lab.get().getAddress() + "!";
            }
        }
        return "Your print job " + jobName + " is ready for pickup!";
    }
}
