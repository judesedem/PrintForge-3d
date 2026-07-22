package com.printforge.marketplace.socialservice.controller;

import com.printforge.marketplace.entity.User;
import com.printforge.marketplace.repository.UserRepository;
import com.printforge.marketplace.socialservice.exception.AlreadyFollowingException;
import com.printforge.marketplace.socialservice.exception.CannotFollowSelfException;
import com.printforge.marketplace.socialservice.model.Follow;
import com.printforge.marketplace.socialservice.repository.FollowRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A user opting to follow a designer — modeled closely on
 * MarketplaceController's favorite endpoints (same shape of problem: an
 * idempotent-ish opt-in relationship plus a count that has to stay
 * accurate). Base path /api/users to sit alongside UserController's other
 * per-user endpoints (designs, stats).
 */
@RestController
@RequestMapping("/api/users")
public class FollowController {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    public FollowController(FollowRepository followRepository, UserRepository userRepository) {
        this.followRepository = followRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/{id}/follow")
    public ResponseEntity<Map<String, Object>> followUser(
            @PathVariable Long id,
            Authentication authentication) {

        User caller = currentUser(authentication);

        if (caller.getUserId().equals(id)) {
            throw new CannotFollowSelfException();
        }
        if (!userRepository.existsById(id)) {
            throw new UsernameNotFoundException("User not found: " + id);
        }
        if (followRepository.existsByFollowerIdAndFollowingId(caller.getUserId(), id)) {
            throw new AlreadyFollowingException(id);
        }

        Follow follow = new Follow();
        follow.setFollowerId(caller.getUserId());
        follow.setFollowingId(id);
        followRepository.save(follow);

        return ResponseEntity.ok(statusResponse(true, id));
    }

    /**
     * Unfollowing someone you don't follow is a no-op, not an error —
     * deliberately different from follow-twice above. Follow is opt-in (a
     * double-press is likely a mistake worth surfacing); unfollow is
     * idempotent (the desired end state — "not following" — is the same
     * either way), so this always returns 204 regardless of whether a
     * Follow row existed. NotFollowingException exists (see
     * socialservice/exception/) but is intentionally never thrown here.
     */
    @DeleteMapping("/{id}/follow")
    public ResponseEntity<Void> unfollowUser(
            @PathVariable Long id,
            Authentication authentication) {

        User caller = currentUser(authentication);
        followRepository.deleteByFollowerIdAndFollowingId(caller.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/follow/status")
    public ResponseEntity<Map<String, Object>> getFollowStatus(
            @PathVariable Long id,
            Authentication authentication) {

        User caller = currentUser(authentication);
        boolean isFollowing = followRepository.existsByFollowerIdAndFollowingId(caller.getUserId(), id);
        return ResponseEntity.ok(statusResponse(isFollowing, id));
    }

    private Map<String, Object> statusResponse(boolean isFollowing, Long followingId) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("isFollowing", isFollowing);
        response.put("followerCount", followRepository.countByFollowingId(followingId));
        return response;
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
