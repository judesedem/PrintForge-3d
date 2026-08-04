import { apiFetch } from './client';

export type ReportTargetType = 'LISTING' | 'USER';

// Mirrors moderationservice/model/Report.java's JSON output — no DTO
// layer on the response side, same as most of this backend's other
// entities-returned-directly endpoints. Only the fields this app actually
// reads are typed here.
export type ReportApiResponse = {
  id: number;
  reporterId: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTIONED';
  createdAt: string;
};

/**
 * Maps to POST /api/reports. CreateReportRequest's real shape (confirmed
 * by reading the DTO directly): { targetType, targetId, reason } — no
 * separate "details" field, just one reason string. targetType must be
 * "LISTING" or "USER" (case-insensitive, backend normalizes to
 * uppercase); reason is required, non-blank, max 1000 characters
 * (ReportService.MAX_REASON_LENGTH) — both enforced server-side via
 * InvalidReportInputException (400), not duplicated here.
 */
export function createReport(
  token: string,
  payload: { targetType: ReportTargetType; targetId: number; reason: string }
): Promise<ReportApiResponse> {
  return apiFetch<ReportApiResponse>('/api/reports', {
    method: 'POST',
    token,
    body: payload,
  });
}
