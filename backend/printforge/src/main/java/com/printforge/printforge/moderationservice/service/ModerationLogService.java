package com.printforge.printforge.moderationservice.service;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.moderationservice.model.ModerationActionType;
import com.printforge.printforge.moderationservice.model.ModerationLogEntry;
import com.printforge.printforge.moderationservice.model.ModerationTargetType;
import com.printforge.printforge.moderationservice.repository.ModerationLogEntryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Single write path for every ModerationLogEntry — callers pass the actor
 * as a User (already resolved via Authentication at each call site) so
 * actorId/actorRole extraction happens once here, keeping every call site
 * a one-line log(...) call rather than repeating that extraction five times.
 */
@Service
public class ModerationLogService {

    private final ModerationLogEntryRepository repository;

    public ModerationLogService(ModerationLogEntryRepository repository) {
        this.repository = repository;
    }

    public void log(User actor, ModerationActionType actionType,
                     ModerationTargetType targetType, Long targetId, String metadata) {

        ModerationLogEntry entry = new ModerationLogEntry();
        entry.setActorId(actor.getUserId());
        entry.setActorRole(actor.getRole().name());
        entry.setActionType(actionType);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setMetadata(metadata);
        repository.save(entry);
    }

    public List<ModerationLogEntry> getLogForTarget(ModerationTargetType targetType, Long targetId) {
        return repository.findByTargetTypeAndTargetIdOrderByCreatedAtAsc(targetType, targetId);
    }
}
