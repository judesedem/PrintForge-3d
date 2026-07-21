package com.printforge.printforge.socialservice.controller;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.socialservice.exception.AlreadyFollowingException;
import com.printforge.printforge.socialservice.exception.CannotFollowSelfException;
import com.printforge.printforge.socialservice.model.Follow;
import com.printforge.printforge.socialservice.repository.FollowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB — same direct-invocation
 * convention as FileControllerTest, since FollowController (like
 * MarketplaceController's favorite endpoints it's modeled on) has no
 * separate service layer to test independently.
 *
 * Run with: ./mvnw test -Dtest=FollowControllerTest
 */
class FollowControllerTest {

    FollowRepository followRepository;
    UserRepository userRepository;
    FollowController controller;
    Authentication callerAuth;

    private static final Long CALLER_ID = 7L;
    private static final String CALLER_EMAIL = "caller@printforge.test";
    private static final Long TARGET_ID = 42L;

    @BeforeEach
    void setUp() {
        followRepository = Mockito.mock(FollowRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        controller = new FollowController(followRepository, userRepository);

        User caller = User.builder().userId(CALLER_ID).email(CALLER_EMAIL).role(Role.STUDENT).build();
        Mockito.when(userRepository.findByEmail(CALLER_EMAIL)).thenReturn(Optional.of(caller));
        Mockito.when(userRepository.existsById(TARGET_ID)).thenReturn(true);

        callerAuth = new UsernamePasswordAuthenticationToken(CALLER_EMAIL, null, java.util.List.of());
    }

    @Test
    void followingCreatesARowAndReturnsFollowStatus() {
        Mockito.when(followRepository.existsByFollowerIdAndFollowingId(CALLER_ID, TARGET_ID)).thenReturn(false);
        Mockito.when(followRepository.countByFollowingId(TARGET_ID)).thenReturn(3L);

        ResponseEntity<Map<String, Object>> response = controller.followUser(TARGET_ID, callerAuth);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(true, response.getBody().get("isFollowing"));
        assertEquals(3L, response.getBody().get("followerCount"));

        ArgumentCaptor<Follow> captor = ArgumentCaptor.forClass(Follow.class);
        Mockito.verify(followRepository).save(captor.capture());
        assertEquals(CALLER_ID, captor.getValue().getFollowerId());
        assertEquals(TARGET_ID, captor.getValue().getFollowingId());
    }

    @Test
    void followingTheSameDesignerTwiceThrowsAlreadyFollowing() {
        Mockito.when(followRepository.existsByFollowerIdAndFollowingId(CALLER_ID, TARGET_ID)).thenReturn(true);

        assertThrows(AlreadyFollowingException.class, () -> controller.followUser(TARGET_ID, callerAuth));
        Mockito.verify(followRepository, Mockito.never()).save(Mockito.any());
    }

    @Test
    void followingYourselfThrowsCannotFollowSelf() {
        assertThrows(CannotFollowSelfException.class, () -> controller.followUser(CALLER_ID, callerAuth));
        Mockito.verify(followRepository, Mockito.never()).save(Mockito.any());
    }

    @Test
    void followingANonexistentUserThrowsNotFound() {
        Mockito.when(userRepository.existsById(999L)).thenReturn(false);

        assertThrows(UsernameNotFoundException.class, () -> controller.followUser(999L, callerAuth));
        Mockito.verify(followRepository, Mockito.never()).save(Mockito.any());
    }

    @Test
    void unfollowingReturns204() {
        ResponseEntity<Void> response = controller.unfollowUser(TARGET_ID, callerAuth);

        assertEquals(204, response.getStatusCode().value());
        Mockito.verify(followRepository).deleteByFollowerIdAndFollowingId(CALLER_ID, TARGET_ID);
    }

    @Test
    void unfollowingSomeoneYouDoNotFollowStillReturns204NotAnError() {
        // No stubbing of existsByFollowerIdAndFollowingId as true — the
        // point is this doesn't even check first, it's an idempotent
        // delete regardless of whether a row existed.
        ResponseEntity<Void> response = assertDoesNotThrow(
                () -> controller.unfollowUser(TARGET_ID, callerAuth));

        assertEquals(204, response.getStatusCode().value());
        Mockito.verify(followRepository).deleteByFollowerIdAndFollowingId(CALLER_ID, TARGET_ID);
    }

    @Test
    void followStatusReflectsRepositoryState() {
        Mockito.when(followRepository.existsByFollowerIdAndFollowingId(CALLER_ID, TARGET_ID)).thenReturn(true);
        Mockito.when(followRepository.countByFollowingId(TARGET_ID)).thenReturn(5L);

        ResponseEntity<Map<String, Object>> response = controller.getFollowStatus(TARGET_ID, callerAuth);

        assertEquals(true, response.getBody().get("isFollowing"));
        assertEquals(5L, response.getBody().get("followerCount"));
    }
}
