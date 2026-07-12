import { apiFetch } from './client';
import type { Job, JobStatus, Material, Quality } from '../data/mockData';

// Mirrors facade/dto/PrintJobResponse.java exactly (snake_case as sent over
// the wire). Keep in sync manually if the backend DTO changes.
export type PrintJobApiResponse = {
  job_id: string;
  user_id: string;
  user_name: string;
  file_name: string;
  material: string;
  color: string;
  quantity: number;
  quality: string | null;
  status: string;
  submitted_at: string | null;
  estimated_cost: number | null;
  estimated_time: number | null;
  printer_name: string | null;
  printer_location: string | null;
  queue_position: number | null;
  tracking_number: string | null;
  notes: string | null;
};

/**
 * Adapts the backend's PrintJobResponse to the frontend's existing `Job`
 * shape (from src/data/mockData.ts), so the screens/components already
 * built against `Job` don't need to change.
 *
 * Known lossy/best-effort mappings:
 * - `title` has no direct backend equivalent (a print job doesn't have a
 *   distinct title, only the source file's name) — using file_name.
 * - `tracking` falls back to the job id if the backend hasn't assigned a
 *   shipping tracking number yet (most jobs won't have one until they ship).
 */
export function toJob(res: PrintJobApiResponse): Job {
  return {
    id: res.job_id,
    title: res.file_name,
    student: res.user_name,
    status: res.status as JobStatus,
    material: res.material as Material,
    quality: (res.quality ?? 'STANDARD') as Quality,
    printer: res.printer_name ?? '',
    location: res.printer_location ?? '',
    cost: res.estimated_cost ?? 0,
    qty: res.quantity,
    submittedAt: res.submitted_at ?? '',
    tracking: res.tracking_number ?? res.job_id,
    notes: res.notes ?? undefined,
  };
}

export async function fetchJobs(token: string, status?: string): Promise<Job[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const data = await apiFetch<PrintJobApiResponse[]>(`/api/print-jobs${query}`, { token });
  return data.map(toJob);
}

export async function fetchJob(token: string, jobId: string): Promise<Job> {
  const data = await apiFetch<PrintJobApiResponse>(`/api/print-jobs/${jobId}`, { token });
  return toJob(data);
}

/**
 * Staff-only. Maps to PATCH /api/print-jobs/{jobId}/approve.
 * Not yet called from any screen — staff/queue.tsx still reads mock data
 * for its approve/reject actions. Wiring that screen is a follow-up.
 */
export async function approveJob(
  token: string,
  jobId: string,
  opts: { estimatedCost?: number; estimatedTime?: number; printerId?: string } = {}
): Promise<Job> {
  const data = await apiFetch<PrintJobApiResponse>(`/api/print-jobs/${jobId}/approve`, {
    method: 'PATCH',
    token,
    body: {
      estimated_cost: opts.estimatedCost,
      estimated_time: opts.estimatedTime,
      printer_id: opts.printerId,
    },
  });
  return toJob(data);
}

/** Staff-only. Maps to PATCH /api/print-jobs/{jobId}/reject. */
export async function rejectJob(token: string, jobId: string, reason?: string): Promise<Job> {
  const data = await apiFetch<PrintJobApiResponse>(`/api/print-jobs/${jobId}/reject`, {
    method: 'PATCH',
    token,
    body: reason ? { reason } : undefined,
  });
  return toJob(data);
}
