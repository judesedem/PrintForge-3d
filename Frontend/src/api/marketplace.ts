import { apiFetch } from './client';

// Mirrors marketplaceservice/model/DesignListing.java's JSON output exactly.
// Same situation as notifications.ts: no DTO layer — MarketplaceController
// returns the JPA entity directly, so field names are Jackson's default
// camelCase getters, not a snake_case mapping like jobs.ts's PrintJobResponse.
export type DesignListingApiResponse = {
  id: number;
  fileId: number | null;
  designerId: number;
  title: string;
  description: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  publishedAt: string | null;
  totalOrders: number;
  totalEarnings: number;
};

/**
 * Named `MarketplaceListing`, not `Listing` — deliberately avoids colliding
 * with the differently-shaped `Listing` type in `src/data/mockData.ts`
 * (still used by `dashboard/designer.tsx`, which is out of this batch's
 * scope). The mock shape has `material`/`rating`/`designer` fields with no
 * backend equivalent (DesignListing has none of those — rating would need
 * a review system, designer name would need a User join by `designerId`,
 * and material isn't tracked per-listing at all), so this is a genuinely
 * new shape rather than an adapter onto the old one.
 */
export type MarketplaceListing = {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnailUrl: string;
  status: 'DRAFT' | 'PUBLISHED';
  totalOrders: number;
  totalEarnings: number;
  createdAt: string;
  publishedAt: string | null;
};

export function toListing(res: DesignListingApiResponse): MarketplaceListing {
  return {
    id: String(res.id),
    title: res.title,
    description: res.description ?? '',
    price: res.basePrice,
    thumbnailUrl: res.thumbnailUrl ?? '',
    status: res.status,
    totalOrders: res.totalOrders,
    totalEarnings: res.totalEarnings,
    createdAt: res.createdAt,
    publishedAt: res.publishedAt,
  };
}

/** Maps to GET /api/marketplace — public storefront, PUBLISHED listings only. */
export async function fetchListings(token: string): Promise<MarketplaceListing[]> {
  const data = await apiFetch<DesignListingApiResponse[]>('/api/marketplace', { token });
  return data.map(toListing);
}

// Mirrors estimateservice/model/Estimate.java's JSON output — same no-DTO
// situation as everything else. Only the fields the payments flow actually
// needs are typed here (the quote's id, used to initiate a payment).
export type EstimateApiResponse = {
  id: number;
  fileId: number | null;
  totalCost: number | null;
};

export type Quote = {
  estimateId: string;
  totalCost: number;
};

/**
 * Maps to GET /api/marketplace/{id}. The backend returns
 * `{ listing, quote, quote_error? }` — it auto-generates a price quote via
 * EstimateService alongside the listing (a real saved Estimate row with its
 * own id). The quote is surfaced here as `Quote` since the payments flow
 * needs its `estimateId` to call `initiatePayment` — see
 * `src/api/payments.ts`'s file-level comment for why paying requires an
 * estimateId, not a jobId. `quote` is null if the backend couldn't
 * generate one (`quote_error` present, e.g. the listing has no fileId).
 */
export async function fetchListing(
  token: string,
  id: string
): Promise<{ listing: MarketplaceListing; quote: Quote | null }> {
  const data = await apiFetch<{
    listing: DesignListingApiResponse;
    quote: EstimateApiResponse | null;
  }>(`/api/marketplace/${id}`, { token });

  return {
    listing: toListing(data.listing),
    quote:
      data.quote && data.quote.totalCost != null
        ? { estimateId: String(data.quote.id), totalCost: data.quote.totalCost }
        : null,
  };
}

/** Maps to GET /api/marketplace/my-listings. DESIGNER-only on the backend (403 otherwise). */
export async function fetchMyListings(token: string): Promise<MarketplaceListing[]> {
  const data = await apiFetch<DesignListingApiResponse[]>('/api/marketplace/my-listings', { token });
  return data.map(toListing);
}

// NOTE: there is no GET /api/marketplace/my-earnings endpoint on the
// backend (checked MarketplaceController.java directly) — Handoff.md's
// Phase 2 table listed one, but it doesn't exist. DesignListing already
// carries totalOrders/totalEarnings per listing, so "earnings" can be
// derived client-side by summing totalEarnings across fetchMyListings()
// results whenever a designer earnings screen gets built.

/**
 * Maps to POST /api/marketplace. The backend binds file_id/title/
 * description/base_price via @RequestParam and thumbnail via @RequestPart
 * — real multipart/form-data fields, not a JSON body — so this sends a
 * FormData request the same way, using apiFetch's isFormData option.
 */
export async function createListing(
  token: string,
  payload: {
    fileId: number;
    title: string;
    description?: string;
    basePrice: number;
    thumbnail?: { uri: string; name: string; type: string };
  }
): Promise<MarketplaceListing> {
  const form = new FormData();
  form.append('file_id', String(payload.fileId));
  form.append('title', payload.title);
  if (payload.description) form.append('description', payload.description);
  form.append('base_price', String(payload.basePrice));
  if (payload.thumbnail) {
    form.append('thumbnail', payload.thumbnail as unknown as Blob);
  }

  const data = await apiFetch<DesignListingApiResponse>('/api/marketplace', {
    method: 'POST',
    token,
    body: form,
    isFormData: true,
  });
  return toListing(data);
}

/** Maps to DELETE /api/marketplace/{id}. Backend only allows deleting DRAFT listings with no orders. */
export function deleteListing(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/api/marketplace/${id}`, { method: 'DELETE', token });
}
