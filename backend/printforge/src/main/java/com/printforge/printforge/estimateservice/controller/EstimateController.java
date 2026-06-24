package com.printforge.printforge.estimateservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.repository.UserRepository;
import jakarta.validation.constraints.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estimates")
@Validated // Tells Spring Boot to enforce the math rules below
public class EstimateController {

    private final EstimateService estimateService;
    private final UserRepository userRepository;

    public EstimateController(EstimateService estimateService, UserRepository userRepository) {
        this.estimateService = estimateService;
        this.userRepository = userRepository;
    }

    // Previously took fileSizeKb directly from the client (@RequestParam
    // Double fileSizeKb) — meaning a student could send any number and get
    // whatever cost/duration that produced. Now it takes fileId and the
    // service derives the real size from the stored file, plus the
    // estimate is recorded against the caller's actual identity.
    @PostMapping
    public ResponseEntity<Estimate> createEstimate(
            @RequestParam @NotNull Long fileId,
            @RequestParam @NotBlank String quality,
            @RequestParam @NotNull @Min(0) @Max(100) Integer infillPercent,
            @RequestParam @NotNull @Min(1) Integer quantity,
            @RequestParam @NotBlank String materialType,
            Authentication authentication) {

        Long requesterId = currentUser(authentication).getUserId();

        Estimate newEstimate = estimateService.calculateAndSaveEstimate(
                fileId, quality, infillPercent, quantity, materialType, requesterId);

        return ResponseEntity.ok(newEstimate);
    }

    // NEW — didn't exist before at all. Contract doc calls for
    // GET /api/estimates/{jobId}; this is intentionally by estimate id
    // instead, since an estimate is created before a job exists (Queue
    // Service's createPrintJob takes an existing estimateId as input).
    // Note: an earlier revision of this endpoint renamed the path variable
    // to {jobId} to look like it matched the contract doc, but the lookup
    // underneath was never changed — it still queries by the estimate's own
    // id. Calling it {jobId} while it actually required an estimate id was
    // a real landmine: anyone reading the route would reasonably pass a
    // print job's id and get a 404, or worse, an unrelated estimate that
    // happens to share that numeric id. Reverted the name to {id} so the
    // route says what it actually does.
    @GetMapping("/{id}")
    public ResponseEntity<Estimate> getEstimateById(@PathVariable Long id, Authentication authentication) {
        Estimate estimate = estimateService.getEstimateById(id);

        if (!isStaff(authentication) && !estimate.getUserId().equals(currentUser(authentication).getUserId())) {
            throw new AccessDeniedException("You can only view your own estimates");
        }
        return ResponseEntity.ok(estimate);
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_LAB_STAFF") || role.equals("ROLE_ADMIN"));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}