import { apiFetch } from './client';
import type { AuthResponse } from './types';

// Mirrors AdminService.getDashboardSummary()'s hand-built Map response —
// there's no DTO class on the backend for this one at all (not even a
// plain-entity return like jobs/notifications/marketplace); the controller
// builds a LinkedHashMap directly. Field names below are exactly the keys
// AdminService puts in that map (a mix of camelCase and snake_case, e.g.
// "jobsByStatus" vs "designer_earnings" — that inconsistency is on the
// backend, not a transcription error here).
export type AdminDashboardApiResponse = {
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  totalPrinters: number;
  printersByStatus: Record<string, number>;
  designer_earnings: Array<{ designer_name: string; total_owed: number }>;
};

export type AdminDashboard = {
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  totalPrinters: number;
  printersByStatus: Record<string, number>;
  designerEarnings: Array<{ designerName: string; totalOwed: number }>;
};

export function toAdminDashboard(res: AdminDashboardApiResponse): AdminDashboard {
  return {
    totalJobs: res.totalJobs,
    jobsByStatus: res.jobsByStatus,
    totalPrinters: res.totalPrinters,
    printersByStatus: res.printersByStatus,
    designerEarnings: res.designer_earnings.map(e => ({
      designerName: e.designer_name,
      totalOwed: e.total_owed,
    })),
  };
}

/** Maps to GET /api/admin/dashboard. LAB_STAFF/ADMIN only (403 otherwise). */
export async function fetchAdminDashboard(token: string): Promise<AdminDashboard> {
  const data = await apiFetch<AdminDashboardApiResponse>('/api/admin/dashboard', { token });
  return toAdminDashboard(data);
}

// Same uppercase convention as auth.ts's SelfRegisterRole ('STUDENT' |
// 'DESIGNER'), extended with the two roles only an ADMIN can grant —
// AuthService.resolveRole() only allows LAB_STAFF/ADMIN through this
// endpoint's caller (self-registration via /api/auth/register rejects them).
export type AdminCreatableRole = 'STUDENT' | 'DESIGNER' | 'LAB_STAFF' | 'ADMIN';

export type AdminCreateUserPayload = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: AdminCreatableRole;
};

/**
 * Maps to POST /api/admin/users. ADMIN only (not LAB_STAFF — the
 * controller method has its own narrower @PreAuthorize than the class-level
 * one). Not called from any screen yet — app/admin/index.tsx's "Users" tab
 * has no create-user form; this exists so the API layer is ready, same
 * precedent as approveJob/rejectJob sitting unused for a batch in jobs.ts.
 */
export function createUser(token: string, payload: AdminCreateUserPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/admin/users', {
    method: 'POST',
    token,
    body: payload,
  });
}

export type AdminUserDto = {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  profile_picture_url: string | null;
  suspended: boolean;
};

export function fetchUsers(token: string): Promise<AdminUserDto[]> {
  return apiFetch<AdminUserDto[]>('/api/admin/users', { token });
}
