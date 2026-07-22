package com.printforge.marketplace.fileservice.repository;

import com.printforge.marketplace.fileservice.model.ModelFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModelFileRepository extends JpaRepository<ModelFile, Long> {
    // JpaRepository gives us built-in methods like save(), findAll(), findById(), and deleteById() automatically!

    List<ModelFile> findByUserId(Long userId);
}