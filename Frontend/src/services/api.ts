// PrintForge 3D — API Service Layer
// Wires up all screens to the Spring Boot backend.
// Base URL comes from env; fall back to localhost for dev.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, PrintJob, Material, Printer, Notification } from '../types';

// ─── Config ────────────────────────────────────────────────────────────────

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080';

const TOKEN_KEY = '@printforge_token';

// ─── Token helpers ─────────────────────────────────────────────────────────

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ─── Core fetch wrapper ────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: object;
  /** Skip auth header (login / register) */
  public?: boolean;
  /** Pass a FormData body (file upload) */
  formData?: FormData;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Could not reach the PrintForge server. Check your connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

// ─── Global 401 handler ────────────────────────────────────────────────────
// useAuth registers a callback here so that any expired/invalid session
// (a 401 from ANY endpoint, not just /auth/*) logs the user out and routes
// them back to the login screen, instead of leaving a broken screen up.

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

const REQUEST_TIMEOUT_MS = 20_000;

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = opts.public ? null : await getToken();

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.formData
        ? opts.formData
        : opts.body
        ? JSON.stringify(opts.body)
        : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    // fetch() throws on network failure, DNS issues, or our own abort/timeout
    throw new NetworkError(
      e?.name === 'AbortError'
        ? 'The request timed out. Please check your connection and try again.'
        : undefined,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.message ?? err.error ?? message;
    } catch (_) {}

    if (res.status === 401 && !opts.public) {
      // Session is invalid/expired — clear it and notify the app shell
      await clearToken();
      onUnauthorized?.();
    }

    throw new ApiError(res.status, message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json();
}

// ─── Auth (/api/auth) ──────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  token: string;
  user: User;
}

/**
 * POST /api/auth/login
 */
export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const data = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    public: true,
  });
  await saveToken(data.token);
  return data;
}

/**
 * POST /api/auth/register
 */
export async function apiRegister(
  full_name: string,
  email: string,
  password: string,
  role: string,
): Promise<RegisterResponse> {
  const data = await request<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: { full_name, email, password, role },
    public: true,
  });
  await saveToken(data.token);
  return data;
}

/**
 * POST /api/auth/logout
 */
export async function apiLogout(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } finally {
    await clearToken();
  }
}

/**
 * GET /api/auth/me
 */
export async function apiGetMe(): Promise<User> {
  return request<User>('/api/auth/me');
}

// ─── Print Jobs (/api/print-jobs) ─────────────────────────────────────────

export interface SubmitJobPayload {
  material: string;
  color: string;
  quantity: number;
  infill: string;
  quality: string;
  notes?: string;
}

/**
 * POST /api/print-jobs   (multipart: file + metadata)
 */
export async function apiSubmitJob(
  file: { uri: string; name: string; mimeType: string },
  payload: SubmitJobPayload,
): Promise<PrintJob> {
  const form = new FormData();
  // React Native FormData accepts this object shape
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);
  form.append('material', payload.material);
  form.append('color', payload.color);
  form.append('quantity', String(payload.quantity));
  form.append('infill', payload.infill);
  form.append('quality', payload.quality);
  if (payload.notes) form.append('notes', payload.notes);

  return request<PrintJob>('/api/print-jobs', { method: 'POST', formData: form });
}

/**
 * GET /api/print-jobs?userId=&status=
 */
export async function apiGetJobs(params?: {
  userId?: string;
  status?: string;
}): Promise<PrintJob[]> {
  const q = new URLSearchParams();
  if (params?.userId) q.set('userId', params.userId);
  if (params?.status) q.set('status', params.status);
  const qs = q.toString() ? `?${q.toString()}` : '';
  return request<PrintJob[]>(`/api/print-jobs${qs}`);
}

/**
 * GET /api/print-jobs/:id
 */
export async function apiGetJob(jobId: string): Promise<PrintJob> {
  return request<PrintJob>(`/api/print-jobs/${jobId}`);
}

/**
 * PATCH /api/print-jobs/:id/approve
 */
export async function apiApproveJob(
  jobId: string,
  payload: { estimated_cost: number; estimated_time: number; printer_id: string },
): Promise<PrintJob> {
  return request<PrintJob>(`/api/print-jobs/${jobId}/approve`, {
    method: 'PATCH',
    body: payload,
  });
}

/**
 * PATCH /api/print-jobs/:id/reject
 */
export async function apiRejectJob(jobId: string, reason: string): Promise<PrintJob> {
  return request<PrintJob>(`/api/print-jobs/${jobId}/reject`, {
    method: 'PATCH',
    body: { reason },
  });
}

// ─── Queue (/api/queue) ────────────────────────────────────────────────────

export interface QueueEntry {
  queue_id: string;
  job_id: string;
  position: number;
  printer_id: string;
  job: PrintJob;
}

/**
 * GET /api/queue
 */
export async function apiGetQueue(printerId?: string): Promise<QueueEntry[]> {
  const qs = printerId ? `?printerId=${printerId}` : '';
  return request<QueueEntry[]>(`/api/queue${qs}`);
}

/**
 * PUT /api/queue/reorder
 * Body: { ordered_job_ids: string[] }
 */
export async function apiReorderQueue(orderedJobIds: string[]): Promise<void> {
  return request('/api/queue/reorder', {
    method: 'PUT',
    body: { ordered_job_ids: orderedJobIds },
  });
}

/**
 * DELETE /api/queue/:jobId
 */
export async function apiRemoveFromQueue(jobId: string): Promise<void> {
  return request(`/api/queue/${jobId}`, { method: 'DELETE' });
}

// ─── Printers (/api/printers) ─────────────────────────────────────────────

/**
 * GET /api/printers
 */
export async function apiGetPrinters(): Promise<Printer[]> {
  return request<Printer[]>('/api/printers');
}

/**
 * GET /api/printers/:id
 */
export async function apiGetPrinter(printerId: string): Promise<Printer> {
  return request<Printer>(`/api/printers/${printerId}`);
}

/**
 * POST /api/printers
 */
export async function apiCreatePrinter(
  data: Omit<Printer, 'printer_id'>,
): Promise<Printer> {
  return request<Printer>('/api/printers', { method: 'POST', body: data });
}

/**
 * PATCH /api/printers/:id/status
 */
export async function apiUpdatePrinterStatus(
  printerId: string,
  printer_status: Printer['printer_status'],
): Promise<Printer> {
  return request<Printer>(`/api/printers/${printerId}/status`, {
    method: 'PATCH',
    body: { printer_status },
  });
}

/**
 * DELETE /api/printers/:id
 */
export async function apiDeletePrinter(printerId: string): Promise<void> {
  return request(`/api/printers/${printerId}`, { method: 'DELETE' });
}

// ─── Materials (/api/materials) ───────────────────────────────────────────

/**
 * GET /api/materials
 */
export async function apiGetMaterials(): Promise<Material[]> {
  return request<Material[]>('/api/materials');
}

// ─── Notifications (/api/notifications) ───────────────────────────────────

/**
 * GET /api/notifications
 */
export async function apiGetNotifications(): Promise<Notification[]> {
  return request<Notification[]>('/api/notifications');
}

/**
 * PATCH /api/notifications/:id/read
 */
export async function apiMarkNotificationRead(notifId: string): Promise<void> {
  return request(`/api/notifications/${notifId}/read`, { method: 'PATCH' });
}

/**
 * PATCH /api/notifications/read-all
 */
export async function apiMarkAllNotificationsRead(): Promise<void> {
  return request('/api/notifications/read-all', { method: 'PATCH' });
}

// ─── Push token registration (/api/notifications/push-token) ──────────────

/**
 * POST /api/notifications/push-token
 */
export async function apiRegisterPushToken(expoPushToken: string): Promise<void> {
  return request('/api/notifications/push-token', {
    method: 'POST',
    body: { token: expoPushToken },
  });
}
