import { apiFetch } from './client';

// Mirrors paymentservice/model/Payment.java's JSON output exactly — no DTO
// layer (same pattern as notifications.ts/marketplace.ts/files.ts), plain
// entity JSON via Jackson's default camelCase getters.
export type PaymentApiResponse = {
  id: number;
  userId: number;
  estimateId: number;
  listingId: number | null;
  printJobId: number | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paystackReference: string;
  checkoutUrl: string;
  initiatedAt: string | null;
  completedAt: string | null;
};

export type Payment = {
  id: string;
  estimateId: string;
  listingId: string | null;
  printJobId: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  checkoutUrl: string;
  initiatedAt: string | null;
  completedAt: string | null;
};

export function toPayment(res: PaymentApiResponse): Payment {
  return {
    id: String(res.id),
    estimateId: String(res.estimateId),
    listingId: res.listingId != null ? String(res.listingId) : null,
    printJobId: res.printJobId != null ? String(res.printJobId) : null,
    amount: res.amount,
    currency: res.currency,
    status: res.status,
    checkoutUrl: res.checkoutUrl,
    initiatedAt: res.initiatedAt,
    completedAt: res.completedAt,
  };
}

/**
 * Maps to POST /api/payments/initiate.
 *
 * IMPORTANT — this does NOT take a jobId, and paying does not act on an
 * existing PrintJob. Read PaymentController.java/PaymentService.java
 * directly before using this: the request body is
 * `{ estimateId, listingId? }`, and the Paystack webhook (handleWebhook,
 * server-side, not called from the frontend) is what CREATES a brand new
 * PrintJob — starting at status SUBMITTED — once payment clears. There is
 * no backend endpoint or field connecting a payment to an already-existing
 * PrintJob; PrintJob.estimateId exists on the entity but is never exposed
 * through the jobs-facade response (src/api/jobs.ts's
 * PrintJobApiResponse has no estimate_id field). See Handoff.md's Payments
 * batch entry for the full reasoning and how this reshaped where payment
 * ended up wired into the frontend (marketplace listing detail, not the
 * jobs list, since that's the only screen with a real estimateId to pay
 * against).
 *
 * No @JsonProperty on InitiatePaymentRequest.java, so the body is plain
 * camelCase — not snake_case like RegisterRequest.
 */
export async function initiatePayment(
  token: string,
  params: { estimateId: string | number; listingId?: string | number | null }
): Promise<Payment> {
  const data = await apiFetch<PaymentApiResponse>('/api/payments/initiate', {
    method: 'POST',
    token,
    body: {
      estimateId: Number(params.estimateId),
      listingId: params.listingId != null ? Number(params.listingId) : undefined,
    },
  });
  return toPayment(data);
}

/** Maps to GET /api/payments/{id}. Owner only (403 otherwise). */
export async function fetchPayment(token: string, paymentId: string): Promise<Payment> {
  const data = await apiFetch<PaymentApiResponse>(`/api/payments/${paymentId}`, { token });
  return toPayment(data);
}

/** Maps to GET /api/payments/my-payments. */
export async function fetchMyPayments(token: string): Promise<Payment[]> {
  const data = await apiFetch<PaymentApiResponse[]>('/api/payments/my-payments', { token });
  return data.map(toPayment);
}

/**
 * Maps to POST /api/payments/{id}/retry. Backend rejects this if the
 * payment is already COMPLETED (a print job exists for it) — only useful
 * for a PENDING or FAILED payment, with a fresh Paystack reference +
 * checkout URL (same amount, no recalculation).
 */
export async function retryPayment(token: string, paymentId: string): Promise<Payment> {
  const data = await apiFetch<PaymentApiResponse>(`/api/payments/${paymentId}/retry`, {
    method: 'POST',
    token,
  });
  return toPayment(data);
}
