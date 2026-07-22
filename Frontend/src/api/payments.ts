import { apiFetch } from './client';

// Mirrors paymentservice/model/Payment.java's JSON output exactly — no DTO
// layer (same pattern as notifications.ts/marketplace.ts/files.ts), plain
// entity JSON via Jackson's default camelCase getters.
export type PaymentApiResponse = {
  id: number;
  userId: number;
  estimateId: number | null;
  listingId: number | null;
  requestId: number | null;
  printJobId: number | null;
  isPremiumUpgrade?: boolean;
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
  estimateId: string | null;
  listingId: string | null;
  requestId: string | null;
  printJobId: string | null;
  isPremiumUpgrade: boolean;
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
    estimateId: res.estimateId != null ? String(res.estimateId) : null,
    listingId: res.listingId != null ? String(res.listingId) : null,
    requestId: res.requestId != null ? String(res.requestId) : null,
    printJobId: res.printJobId != null ? String(res.printJobId) : null,
    isPremiumUpgrade: !!res.isPremiumUpgrade,
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
 */
export async function initiatePayment(
  token: string,
  params: { estimateId?: string | number | null; listingId?: string | number | null; requestId?: string | number | null; isPremiumUpgrade?: boolean; color?: string; notes?: string; }
): Promise<Payment> {
  const data = await apiFetch<PaymentApiResponse>('/api/payments/initiate', {
    method: 'POST',
    token,
    body: {
      estimateId: params.estimateId != null ? Number(params.estimateId) : undefined,
      listingId: params.listingId != null ? Number(params.listingId) : undefined,
      requestId: params.requestId != null ? Number(params.requestId) : undefined,
      isPremiumUpgrade: params.isPremiumUpgrade,
      color: params.color,
      notes: params.notes,
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
