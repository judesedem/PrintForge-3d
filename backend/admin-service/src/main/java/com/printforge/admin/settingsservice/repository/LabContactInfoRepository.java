package com.printforge.admin.settingsservice.repository;

import com.printforge.admin.settingsservice.model.LabContactInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// No custom finders — this is a fixed single-row table, always id=1.
@Repository
public interface LabContactInfoRepository extends JpaRepository<LabContactInfo, Long> {
}
