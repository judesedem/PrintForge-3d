package com.printforge.marketplace.moderationservice.repository;

import com.printforge.marketplace.moderationservice.model.ModerationLogEntry;
import com.printforge.marketplace.moderationservice.model.ModerationTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModerationLogEntryRepository extends JpaRepository<ModerationLogEntry, Long> {
    List<ModerationLogEntry> findByTargetTypeAndTargetIdOrderByCreatedAtAsc(
            ModerationTargetType targetType, Long targetId);
}
