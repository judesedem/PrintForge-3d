package com.printforge.printforge.socialservice.controller;

import com.printforge.printforge.dto.UserStatsResponse;
import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.service.UserService;
import com.printforge.printforge.socialservice.repository.FollowRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real Spring context + real DB — the acceptance criteria for #A6
 * explicitly ask for "follower/following counts update correctly for
 * both parties" and "GET /api/users/{id}/stats returns real non-zero
 * values" — both are correctness claims about actual persisted counts,
 * not just control flow, so (matching this session's established pattern
 * for count-correctness claims, e.g. the N+1/batching work) this verifies
 * against the real DB rather than a mocked repository.
 *
 * Cleans up every row it creates in @AfterEach regardless of outcome.
 *
 * Run with: ./mvnw test -Dtest=FollowCountsIntegrationTest
 */
@SpringBootTest
class FollowCountsIntegrationTest {

    @Autowired FollowController followController;
    @Autowired UserService userService;
    @Autowired FollowRepository followRepository;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Long followerId;
    private Long designerId;

    @AfterEach
    void cleanUp() {
        if (followerId != null && designerId != null) {
            followRepository.deleteByFollowerIdAndFollowingId(followerId, designerId);
        }
        if (followerId != null) userRepository.deleteById(followerId);
        if (designerId != null) userRepository.deleteById(designerId);
    }

    @Test
    void followerAndFollowingCountsUpdateCorrectlyForBothPartiesAndFeedIntoUserStats() {
        User follower = User.builder()
                .fullName("Follow Counts Test Follower")
                .email("follow-counts-follower@printforge.test")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.STUDENT)
                .build();
        follower = userRepository.save(follower);
        followerId = follower.getUserId();

        User designer = User.builder()
                .fullName("Follow Counts Test Designer")
                .email("follow-counts-designer@printforge.test")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.DESIGNER)
                .build();
        designer = userRepository.save(designer);
        designerId = designer.getUserId();

        Authentication followerAuth = new UsernamePasswordAuthenticationToken(
                follower.getEmail(), null, Set.of(new SimpleGrantedAuthority("ROLE_STUDENT")));

        // Before following: both counts are 0.
        assertEquals(0, followRepository.countByFollowingId(designerId));
        assertEquals(0, followRepository.countByFollowerId(followerId));
        UserStatsResponse statsBefore = userService.getUserStats(designerId, designerId, false);
        assertEquals(0, statsBefore.getFollowerCount());

        // Follow.
        followController.followUser(designerId, followerAuth);

        assertEquals(1, followRepository.countByFollowingId(designerId),
                "designer's follower count should reflect the new follow");
        assertEquals(1, followRepository.countByFollowerId(followerId),
                "follower's following count should reflect the new follow");

        UserStatsResponse statsAfterFollow = userService.getUserStats(designerId, designerId, false);
        assertEquals(1, statsAfterFollow.getFollowerCount(),
                "GET /api/users/{id}/stats should return the real, non-zero follower count");

        // Unfollow.
        followController.unfollowUser(designerId, followerAuth);

        assertEquals(0, followRepository.countByFollowingId(designerId));
        assertEquals(0, followRepository.countByFollowerId(followerId));
    }
}
