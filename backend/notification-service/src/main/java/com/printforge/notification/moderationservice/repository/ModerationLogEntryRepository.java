package com.printforge.notification.moderationservice.repository;

import com.printforge.notification.moderationservice.model.ModerationLogEntry;
import com.printforge.notification.moderationservice.model.ModerationTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModerationLogEntryRepository extends JpaRepository<ModerationLogEntry, Long> {
    List<ModerationLogEntry> findByTargetTypeAndTargetIdOrderByCreatedAtAsc(
            ModerationTargetType targetType, Long targetId);
}
