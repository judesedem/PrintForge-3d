import { router } from 'expo-router';
import type { ErrorResponse } from './types';
import { clearStoredToken } from '../authStorage';
import { emitToast } from '../ToastContext';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  // Fails loudly at import time rather than producing confusing
  // "Network request failed" errors deep inside a screen later.
  console.warn(
    'EXPO_PUBLIC_API_URL is not set — API calls will fail. Add it to your .env, ' +
      'e.g. EXPO_PUBLIC_API_URL=http://localhost:8080'
  );
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  /** Set for multipart/form-data uploads — pass a FormData body and omit Content-Type. */
  isFormData?: boolean;
};

/**
 * Thin wrapper around fetch. Every screen should call through this
 * instead of calling fetch() directly, so auth headers, the base URL,
 * and error shapes stay consistent in one place.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, isFormData = false } = options;

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
  } catch (networkError) {
    // fetch() throws on DNS failure, no connection, etc. — before we
    // ever get a status code. Surface this distinctly from a 4xx/5xx.
    // Toasted here (this is the one universal choke point for every API
    // call in the app) in addition to whatever inline error the calling
    // screen shows — "no connection" is worth surfacing immediately
    // rather than relying on the user to spot an inline message.
    const message = 'Could not reach the server. Check your connection and API URL.';
    emitToast(message);
    throw new ApiError(0, message);
  }

  // 204 No Content (e.g. DELETE endpoints) — nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const errorBody = data as ErrorResponse | undefined;
    const message = errorBody?.message ?? `Request failed (${response.status})`;

    // The backend has no refresh-token flow, so a 401 on an authenticated
    // request means the JWT itself is invalid/expired — re-login is the
    // only correct recovery. Gated on `token` being present on this
    // specific request: /api/auth/login and /api/auth/register are
    // unauthenticated endpoints that also return 401 for wrong
    // credentials, and that case must NOT force-navigate away from the
    // login screen the user is already looking at (auth.ts's login()/
    // register() never pass a token, so they can't trigger this).
    if (response.status === 401 && token) {
      await clearStoredToken();
      emitToast('Your session expired — please sign in again.');
      router.replace('/(auth)/login');
    }

    throw new ApiError(response.status, message);
  }

  return data as T;
}
