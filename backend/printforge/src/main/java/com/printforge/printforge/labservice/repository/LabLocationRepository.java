package com.printforge.printforge.labservice.repository;

import com.printforge.printforge.labservice.model.LabLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LabLocationRepository extends JpaRepository<LabLocation, Long> {
    List<LabLocation> findByIsActiveTrue();
}
