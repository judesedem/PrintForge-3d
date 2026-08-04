import { apiFetch } from './client';
import type { AuthResponse, LoginPayload, RegisterPayload, UserDto, UpdateProfilePayload } from './types';

/**
 * Email/password registration. Maps to POST /api/auth/register —
 * AuthService.register() defaults role to STUDENT if omitted and throws
 * (400) if 'role' is anything other than STUDENT/DESIGNER, so keep the
 * caller restricted to SelfRegisterRole.
 */
export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Email/password login. Maps to POST /api/auth/login.
 */
export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Exchanges a Firebase ID token (from a completed Google/Apple sign-in)
 * for a PrintForge JWT. Maps to POST /api/auth/firebase on the backend —
 * see AuthController.loginWithFirebase / AuthService.loginWithFirebase.
 */
export function loginWithFirebase(idToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/firebase', {
    method: 'POST',
    body: { idToken },
  });
}

/**
 * Validates a stored PrintForge JWT and returns the current user.
 * Maps to GET /api/auth/me — requires the token, since JwtAuthFilter
 * reads @AuthenticationPrincipal from it.
 */
export function getCurrentUser(token: string): Promise<UserDto> {
  return apiFetch<UserDto>('/api/auth/me', { token });
}

/**
 * Backend logout is stateless (JWTs aren't tracked server-side) — this
 * just exists so the call doesn't 404. The actual sign-out is deleting
 * the locally stored token, done by the caller.
 */
export function logout(token: string): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST', token });
}

/**
 * Maps to POST /api/auth/forgot-password.
 */
export function forgotPassword(email: string): Promise<void> {
  return apiFetch<void>('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

/**
 * Maps to PATCH /api/auth/change-password — this endpoint does not exist
 * on the backend yet. change-password.tsx calls this and catches the
 * failure itself with a "coming soon" toast until the real endpoint lands.
 */
export function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return apiFetch<void>('/api/auth/change-password', {
    method: 'PATCH',
    token,
    body: { currentPassword, newPassword },
  });
}

/**
 * Maps to PATCH /api/auth/profile.
 */
export function updateProfile(
  token: string,
  payload: UpdateProfilePayload,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/profile', {
    method: 'PATCH',
    token,
    body: payload,
  });
}

/**
 * Maps to POST /api/users/upgrade-premium in marketplace-service. This is
 * a genuinely separate feature from upgradeToDesigner() below — it only
 * flips the `is_premium` flag (paid "Verified" designer tier, purchased
 * via the Paystack flow in profile.tsx), and has nothing to do with the
 * DESIGNER role. Do not use this for role upgrades.
 */
export function upgradeToPremium(token: string): Promise<UserDto> {
  return apiFetch<UserDto>('/api/users/upgrade-premium', {
    method: 'POST',
    token,
  });
}

/**
 * Maps to POST /api/auth/upgrade-to-designer — the real STUDENT→DESIGNER
 * role change (auth-service's AuthService.upgradeToDesigner()). Returns
 * UserDto directly, not AuthResponse — this endpoint doesn't reissue a
 * token, since JwtAuthFilter re-resolves the caller's role from the DB on
 * every request rather than trusting a role claim baked into the JWT, so
 * no re-login is needed for the new role to take effect. Idempotent on
 * the backend: calling this again once already DESIGNER returns 200 with
 * the same UserDto rather than an error. Throws (400, via ApiError) if
 * the account isn't STUDENT or DESIGNER (e.g. LAB_STAFF/ADMIN), with a
 * message naming the current role.
 */
export function upgradeToDesigner(token: string): Promise<UserDto> {
  return apiFetch<UserDto>('/api/auth/upgrade-to-designer', {
    method: 'POST',
    token,
  });
}

/**
 * Maps to DELETE /api/auth/account.
 */
export function deleteAccount(token: string, password: string): Promise<void> {
  return apiFetch<void>('/api/auth/account', {
    method: 'DELETE',
    token,
    body: { password },
  });
}
