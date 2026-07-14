import { apiFetch } from './client';

// Mirrors estimateservice/model/Estimate.java's JSON output — no DTO layer
// (same as notifications/marketplace/files/payments), plain entity JSON,
// Jackson default camelCase.
export type EstimateApiResponse = {
  id: number;
  fileId: number | null;
  userId: number | null;
  fileSizeKb: number | null;
  quality: string;
  infillPercent: number | null;
  quantity: number | null;
  materialType: string;
  totalCost: number | null;
  estimatedGrams: number | null;
  durationMinutes: number | null;
  createdAt: string | null;
};

export type Estimate = {
  id: string;
  quality: string;
  infillPercent: number;
  quantity: number;
  materialType: string;
  totalCost: number;
  estimatedGrams: number;
  durationMinutes: number;
};

export function toEstimate(res: EstimateApiResponse): Estimate {
  return {
    id: String(res.id),
    quality: res.quality,
    infillPercent: res.infillPercent ?? 0,
    quantity: res.quantity ?? 1,
    materialType: res.materialType,
    totalCost: res.totalCost ?? 0,
    estimatedGrams: res.estimatedGrams ?? 0,
    durationMinutes: res.durationMinutes ?? 0,
  };
}

/**
 * Maps to POST /api/estimates.
 *
 * IMPORTANT: EstimateController.createEstimate binds every field via
 * @RequestParam, not @RequestBody — these are query-string parameters, not
 * a JSON body (unlike payments.ts's initiatePayment). Built manually with
 * encodeURIComponent rather than the URLSearchParams global, since that
 * isn't guaranteed available in every React Native JS engine.
 *
 * `quality` must be the uppercase backend enum ("DRAFT"/"STANDARD"/"HIGH")
 * — validated server-side against exactly that set. Do NOT run this
 * through mapQualityForUpload() (src/api/utils.ts) — that mapping is for
 * the unrelated POST /api/print-jobs/upload endpoint, which this app's
 * payment-gated submit flow never calls.
 */
export async function createEstimate(
  token: string,
  params: {
    fileId: string | number;
    quality: 'DRAFT' | 'STANDARD' | 'HIGH';
    infillPercent: number;
    quantity: number;
    materialType: string;
  }
): Promise<Estimate> {
  const query = [
    `fileId=${encodeURIComponent(String(params.fileId))}`,
    `quality=${encodeURIComponent(params.quality)}`,
    `infillPercent=${encodeURIComponent(String(params.infillPercent))}`,
    `quantity=${encodeURIComponent(String(params.quantity))}`,
    `materialType=${encodeURIComponent(params.materialType)}`,
  ].join('&');

  const data = await apiFetch<EstimateApiResponse>(`/api/estimates?${query}`, {
    method: 'POST',
    token,
  });
  return toEstimate(data);
}

/** Maps to GET /api/estimates/{id}. Owner or staff only (403 otherwise). */
export async function fetchEstimate(token: string, id: string): Promise<Estimate> {
  const data = await apiFetch<EstimateApiResponse>(`/api/estimates/${id}`, { token });
  return toEstimate(data);
}
