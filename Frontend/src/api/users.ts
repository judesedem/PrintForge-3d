import { apiFetch, ApiError } from './client';

export type UserStats = {
  userId: number;
  designCount: number;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
  totalEarnings: number | null; // null if unauthorized
};

/**
 * Fetch stats for a specific user.
 * Maps to GET /api/users/{id}/stats
 */
export async function fetchUserStats(token: string, userId: number): Promise<UserStats> {
  return apiFetch<UserStats>(`/api/users/${userId}/stats`, { token });
}

export type FollowStatus = {
  isFollowing: boolean;
  followerCount: number;
};

/** Maps to GET /api/users/{id}/follow/status. */
export function getFollowStatus(token: string, userId: number): Promise<FollowStatus> {
  return apiFetch<FollowStatus>(`/api/users/${userId}/follow/status`, { token });
}

/**
 * Maps to POST /api/users/{id}/follow. A 409 means the backend's own
 * AlreadyFollowingException fired — same double-tap-race reasoning as
 * marketplace.ts's addFavorite(): swallowed as a no-op rather than
 * surfacing an error toast, since the end state (following) is the same
 * either way.
 */
export async function followUser(token: string, userId: number): Promise<void> {
  try {
    await apiFetch<void>(`/api/users/${userId}/follow`, { method: 'POST', token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return;
    throw err;
  }
}

/**
 * Maps to DELETE /api/users/{id}/follow. Backend is already idempotent
 * (always 204, even if not currently following — NotFollowingException
 * exists but is deliberately never thrown) so there's no error case to
 * special-case here, unlike followUser()/addFavorite().
 */
export function unfollowUser(token: string, userId: number): Promise<void> {
  return apiFetch<void>(`/api/users/${userId}/follow`, { method: 'DELETE', token });
}

export type FollowedUser = {
  id: number;
  fullName: string;
  profilePictureUrl: string | null;
  followerCount: number;
};

/** Maps to GET /api/users/following — the caller's own list of who they follow. */
export function fetchFollowing(token: string): Promise<FollowedUser[]> {
  return apiFetch<FollowedUser[]>('/api/users/following', { token });
}
