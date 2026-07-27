import { apiFetch } from './client';

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
