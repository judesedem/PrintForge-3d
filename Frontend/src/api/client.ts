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

// All 5 tabs (dashboard/marketplace/submit/orders/profile) mount at once
// under (app)/(tabs) — see SwipePager, which renders every page eagerly
// rather than lazily — so a single expired/invalid token can make several
// authenticated requests 401 in the same tick. Without this guard each one
// would independently call router.replace('/(auth)/login'), and those
// redundant replace() calls can race a screen's own in-flight navigation
// (e.g. register.tsx replacing to '/(app)/(tabs)' the instant it succeeds).
let redirectingToLogin = false;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Toast + ApiError(0) for the case where fetch() never produced a
 * response at all. Status 0 is the app's convention for "no HTTP
 * exchange happened", distinguishing it from any real 4xx/5xx.
 */
function networkFailure(): ApiError {
  const message =
    'Could not reach the server. It may be waking up — check your connection and try again.';
  emitToast(message);
  return new ApiError(0, message);
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

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    });

  // Retrying is safe only for GET. The backend is on Render's free tier,
  // where two things routinely produce a failure that a second attempt
  // would sail through: a service spun down after 15 minutes idle takes
  // ~a minute to wake (fetch can time out first), and every push
  // redeploys all eight services, briefly leaving a route with no live
  // instance (Render answers 502 + `x-render-routing: no-deploy`).
  //
  // Non-GET requests are deliberately NOT retried: when fetch() throws we
  // cannot know whether the server processed the request, and replaying a
  // POST /api/auth/register that actually succeeded would surface a
  // spurious "email already exists" over a completed signup.
  const retryable = method === 'GET';

  let response: Response;
  try {
    response = await doFetch();
    if (retryable && (response.status === 502 || response.status === 503 || response.status === 504)) {
      await new Promise((r) => setTimeout(r, 1500));
      response = await doFetch();
    }
  } catch (networkError) {
    if (retryable) {
      try {
        response = await doFetch();
      } catch {
        throw networkFailure();
      }
    } else {
      // fetch() throws on DNS failure, no connection, timeout, etc. —
      // before we ever get a status code. Surface this distinctly from a
      // 4xx/5xx. Toasted here (this is the one universal choke point for
      // every API call in the app) in addition to whatever inline error
      // the calling screen shows.
      throw networkFailure();
    }
  }

  // 204 No Content (e.g. DELETE endpoints) — nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  // Not every response is JSON, even though every *application* response
  // is. Render's proxy answers with an HTML error page when a service is
  // down or mid-redeploy, and JSON.parse() on that threw a raw
  // "JSON Parse error: Unexpected character: <" straight into the UI —
  // which tells the user nothing and hides the actual status code.
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    const message = response.status >= 500
      ? 'The server is unavailable right now. It may be restarting — try again in a moment.'
      : `Unexpected response from the server (${response.status}).`;
    emitToast(message);
    throw new ApiError(response.status, message);
  }

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
    if (response.status === 401 && token && !redirectingToLogin) {
      redirectingToLogin = true;
      await clearStoredToken();
      emitToast('Your session expired — please sign in again.');
      router.replace('/(auth)/login');
      // Reset shortly after so a genuine future session expiry (not just
      // this burst of parallel 401s) can still trigger the redirect again.
      setTimeout(() => { redirectingToLogin = false; }, 2000);
    }

    throw new ApiError(response.status, message);
  }

  return data as T;
}
