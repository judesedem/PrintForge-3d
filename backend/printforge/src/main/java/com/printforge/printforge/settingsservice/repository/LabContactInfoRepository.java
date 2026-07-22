package com.printforge.printforge.settingsservice.repository;

import com.printforge.printforge.settingsservice.model.LabContactInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// No custom finders — this is a fixed single-row table, always id=1.
@Repository
public interface LabContactInfoRepository extends JpaRepository<LabContactInfo, Long> {
}
