import { apiFetch } from './client';
import type { AuthResponse, LoginPayload, RegisterPayload, UserDto } from './types';

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
