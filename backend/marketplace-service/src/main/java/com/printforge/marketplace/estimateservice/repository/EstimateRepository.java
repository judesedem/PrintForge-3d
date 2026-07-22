package com.printforge.marketplace.estimateservice.repository;

import com.printforge.marketplace.estimateservice.model.Estimate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EstimateRepository extends JpaRepository<Estimate, Long> {
    // You don't even need to write any methods here!
    // JpaRepository automatically gives you .save(), .findById(), and .findAll()
}