package com.printforge.marketplace.marketplaceservice.repository;

import com.printforge.marketplace.marketplaceservice.model.DesignRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DesignRequestRepository extends JpaRepository<DesignRequest, Long> {
    List<DesignRequest> findByUserId(Long userId);
    List<DesignRequest> findByStatus(String status);
}
