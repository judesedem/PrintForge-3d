package com.printforge.printforge.labservice.controller;

import com.printforge.printforge.labservice.dto.CreateLabLocationRequest;
import com.printforge.printforge.labservice.dto.UpdateLabLocationRequest;
import com.printforge.printforge.labservice.model.LabLocation;
import com.printforge.printforge.labservice.service.LabLocationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/labs")
public class LabLocationController {

    private final LabLocationService labLocationService;

    public LabLocationController(LabLocationService labLocationService) {
        this.labLocationService = labLocationService;
    }

    @GetMapping
    public ResponseEntity<List<LabLocation>> getActiveLabs() {
        return ResponseEntity.ok(labLocationService.getActiveLabs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LabLocation> getLab(@PathVariable Long id) {
        return ResponseEntity.ok(labLocationService.getLabById(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<LabLocation> createLab(@Valid @RequestBody CreateLabLocationRequest request) {
        return ResponseEntity.ok(labLocationService.createLab(request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<LabLocation> updateLab(
            @PathVariable Long id,
            @RequestBody UpdateLabLocationRequest request) {
        return ResponseEntity.ok(labLocationService.updateLab(id, request));
    }
}
