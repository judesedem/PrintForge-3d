package com.printforge.printforge.fileservice.repository;

import com.printforge.printforge.fileservice.model.ModelFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ModelFileRepository extends JpaRepository<ModelFile, Long> {
    // JpaRepository gives us built-in methods like save(), findAll(), findById(), and deleteById() automatically!
}