package com.printforge.order.materialservice.repository;

import com.printforge.order.materialservice.model.Material;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MaterialRepository extends JpaRepository<Material, Long> {
    Optional<Material> findByName(String name);
    boolean existsByName(String name);
}
