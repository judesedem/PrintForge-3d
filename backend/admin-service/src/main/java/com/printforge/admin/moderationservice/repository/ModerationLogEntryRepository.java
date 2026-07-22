package com.printforge.admin.moderationservice.repository;

import com.printforge.admin.moderationservice.model.ModerationLogEntry;
import com.printforge.admin.moderationservice.model.ModerationTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModerationLogEntryRepository extends JpaRepository<ModerationLogEntry, Long> {
    List<ModerationLogEntry> findByTargetTypeAndTargetIdOrderByCreatedAtAsc(
            ModerationTargetType targetType, Long targetId);
}
