package com.printforge.payment.labservice.service;

import com.printforge.payment.labservice.dto.CreateLabLocationRequest;
import com.printforge.payment.labservice.dto.UpdateLabLocationRequest;
import com.printforge.payment.labservice.exception.LabLocationNotFoundException;
import com.printforge.payment.labservice.model.LabLocation;
import com.printforge.payment.labservice.repository.LabLocationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class LabLocationService {

    private final LabLocationRepository labLocationRepository;

    public LabLocationService(LabLocationRepository labLocationRepository) {
        this.labLocationRepository = labLocationRepository;
    }

    public List<LabLocation> getActiveLabs() {
        return labLocationRepository.findByIsActiveTrue();
    }

    public LabLocation getLabById(Long id) {
        return labLocationRepository.findById(id)
                .orElseThrow(() -> new LabLocationNotFoundException(id));
    }

    public Optional<LabLocation> findById(Long id) {
        if (id == null) return Optional.empty();
        return labLocationRepository.findById(id);
    }

    /** Used when a job is approved, to stamp it with a pickup location. */
    public Optional<LabLocation> getActiveLab() {
        return labLocationRepository.findByIsActiveTrue().stream().findFirst();
    }

    public LabLocation createLab(CreateLabLocationRequest request) {
        LabLocation lab = new LabLocation();
        lab.setName(request.getName());
        lab.setAddress(request.getAddress());
        lab.setLatitude(request.getLatitude());
        lab.setLongitude(request.getLongitude());
        return labLocationRepository.save(lab);
    }

    public LabLocation updateLab(Long id, UpdateLabLocationRequest request) {
        LabLocation lab = getLabById(id);

        if (request.getName() != null) lab.setName(request.getName());
        if (request.getAddress() != null) lab.setAddress(request.getAddress());
        if (request.getLatitude() != null) lab.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) lab.setLongitude(request.getLongitude());
        if (request.getIsActive() != null) lab.setIsActive(request.getIsActive());

        return labLocationRepository.save(lab);
    }
}
