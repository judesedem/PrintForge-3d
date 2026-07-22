package com.printforge.marketplace.marketplaceservice.controller;

import com.printforge.marketplace.entity.User;
import com.printforge.marketplace.marketplaceservice.model.Challenge;
import com.printforge.marketplace.marketplaceservice.repository.ChallengeRepository;
import com.printforge.marketplace.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {

    private final ChallengeRepository challengeRepository;
    private final UserRepository userRepository;

    public ChallengeController(ChallengeRepository challengeRepository, UserRepository userRepository) {
        this.challengeRepository = challengeRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Challenge>> getAllChallenges(@RequestParam(required = false) String status) {
        List<Challenge> challenges;
        if (status != null && !status.isBlank()) {
            challenges = challengeRepository.findByStatus(status.toUpperCase());
        } else {
            challenges = challengeRepository.findAll();
        }
        
        enrichWithUser(challenges);
        return ResponseEntity.ok(challenges);
    }

    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PostMapping(consumes = "application/json")
    public ResponseEntity<Challenge> createChallenge(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        
        User caller = currentUser(authentication);

        Challenge challenge = new Challenge();
        challenge.setPostedBy(caller.getUserId());
        challenge.setTitle((String) body.get("title"));
        challenge.setDescription((String) body.get("description"));
        
        if (body.containsKey("prize")) {
            challenge.setPrize(new BigDecimal(body.get("prize").toString()));
        }
        
        if (body.containsKey("deadline")) {
            challenge.setDeadline(LocalDateTime.parse((String) body.get("deadline")));
        }

        Challenge saved = challengeRepository.save(challenge);
        saved.setPostedByName(caller.getFullName());
        
        return ResponseEntity.ok(saved);
    }

    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<Challenge> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        
        Challenge challenge = challengeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Challenge not found: " + id));
                
        if (body.containsKey("status")) {
            challenge.setStatus(body.get("status").toUpperCase());
        }
        
        Challenge saved = challengeRepository.save(challenge);
        
        userRepository.findById(saved.getPostedBy()).ifPresent(user -> saved.setPostedByName(user.getFullName()));
        
        return ResponseEntity.ok(saved);
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UsernameNotFoundException("User not found");
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private void enrichWithUser(List<Challenge> challenges) {
        if (challenges.isEmpty()) return;
        List<Long> userIds = challenges.stream()
                .map(Challenge::getPostedBy)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));
        for (Challenge challenge : challenges) {
            User user = users.get(challenge.getPostedBy());
            if (user != null) {
                challenge.setPostedByName(user.getFullName());
            }
        }
    }
}
