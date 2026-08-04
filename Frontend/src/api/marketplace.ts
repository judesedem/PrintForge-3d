import { apiFetch, ApiError } from './client';

// Mirrors marketplaceservice/model/DesignListing.java's JSON output exactly.
// Same situation as notifications.ts: no DTO layer — MarketplaceController
// returns the JPA entity directly, so field names are Jackson's default
// camelCase getters, not a snake_case mapping like jobs.ts's PrintJobResponse.
export type DesignListingApiResponse = {
  id: number;
  fileId: number | null;
  designerId: number;
  designerName?: string;
  designerAvatar?: string;
  isPremiumDesigner?: boolean;
  title: string;
  description: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  publishedAt: string | null;
  totalOrders: number;
  totalEarnings: number;
  category?: string;
  isFavorited?: boolean;
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
  designerName?: string;
  designerAvatar?: string;
  isPremiumDesigner?: boolean;
  category?: string;
  isFavorited?: boolean;
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
    designerName: res.designerName,
    designerAvatar: res.designerAvatar,
    isPremiumDesigner: res.isPremiumDesigner,
    category: res.category,
    isFavorited: res.isFavorited,
  };
}

// Spring's Pageable binding — plain "page"/"size" query params, no custom
// resolver configured (see MarketplaceController.clampPageSize()'s own
// comment). MAX_PAGE_SIZE server-side is 50; requesting that directly
// instead of relying on the 20-item default halves the number of pages a
// caller has to page through for a storefront this size.
const LISTINGS_PAGE_SIZE = 50;

// Mirrors Spring Data's Page<DesignListing> JSON shape — only the fields
// callers actually need to drive "load more" UI (pageable/sort/first/
// numberOfElements/empty from the raw response are dropped).
export type ListingsPage = {
  listings: MarketplaceListing[];
  pageNumber: number;
  totalPages: number;
  totalElements: number;
};

/**
 * Maps to GET /api/marketplace — public storefront, PUBLISHED listings
 * only. The endpoint is genuinely paginated (confirmed via a direct curl:
 * an unparameterized call returns exactly 20 items even when 103 are
 * published — see the 2026-08-04 Handoff.md entry on the blank-thumbnail
 * bug this surfaced). Returns the full page envelope, not a flattened
 * array, so callers can implement real incremental loading (fetch page 0,
 * then more pages as the user scrolls) instead of guessing when to stop —
 * `pageNumber + 1 >= totalPages` is the stop condition every caller below
 * uses.
 */
export async function fetchListings(
  token: string,
  options: { page?: number; category?: string; sort?: 'newest' | 'trending' } = {}
): Promise<ListingsPage> {
  const { page = 0, category, sort } = options;
  const params = new URLSearchParams({ page: String(page), size: String(LISTINGS_PAGE_SIZE) });
  if (category) params.set('category', category);
  if (sort) params.set('sort', sort);

  const data = await apiFetch<{
    content: DesignListingApiResponse[];
    number: number;
    totalPages: number;
    totalElements: number;
  }>(`/api/marketplace?${params.toString()}`, { token });

  return {
    listings: data.content.map(toListing),
    pageNumber: data.number,
    totalPages: data.totalPages,
    totalElements: data.totalElements,
  };
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

/**
 * Maps to GET /api/marketplace/{id}/quote. Fetches a new auto-generated
 * quote with custom parameters (quantity, quality, infill, material).
 */
export async function fetchCustomQuote(
  token: string,
  id: string,
  params: {
    quality: string;
    infillPercent: number;
    quantity: number;
    materialType: string;
  }
): Promise<Quote> {
  const query = new URLSearchParams({
    quality: params.quality,
    infillPercent: String(params.infillPercent),
    quantity: String(params.quantity),
    materialType: params.materialType,
  }).toString();

  const data = await apiFetch<EstimateApiResponse>(`/api/marketplace/${id}/quote?${query}`, {
    token,
  });

  return {
    estimateId: String(data.id),
    totalCost: data.totalCost ?? 0,
  };
}

/** Maps to GET /api/marketplace/my-listings. DESIGNER-only on the backend (403 otherwise). */
export async function fetchMyListings(token: string): Promise<MarketplaceListing[]> {
  const data = await apiFetch<DesignListingApiResponse[]>('/api/marketplace/my-listings', { token });
  return data.map(toListing);
}

/**
 * Maps to GET /api/marketplace/favorites — the caller's own favorited
 * listings. Same shape as fetchMyListings(): a flat, unpaginated
 * List<DesignListing> on the backend (a user's favorite count is
 * naturally bounded, unlike the full storefront), so no page/size params
 * here either.
 */
export async function fetchFavorites(token: string): Promise<MarketplaceListing[]> {
  const data = await apiFetch<DesignListingApiResponse[]>('/api/marketplace/favorites', { token });
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
    ownershipAttested: boolean;
  }
): Promise<MarketplaceListing> {
  const form = new FormData();
  form.append('file_id', String(payload.fileId));
  form.append('title', payload.title);
  if (payload.description) form.append('description', payload.description);
  form.append('base_price', String(payload.basePrice));
  form.append('ownership_attested', String(payload.ownershipAttested));
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

/** Maps to PATCH /api/marketplace/{id}/publish. Transitions DRAFT → PUBLISHED. DESIGNER only. */
export async function publishListing(token: string, id: string): Promise<MarketplaceListing> {
  const data = await apiFetch<DesignListingApiResponse>(`/api/marketplace/${id}/publish`, {
    method: 'PATCH',
    token,
  });
  return toListing(data);
}

/** Maps to PATCH /api/marketplace/{id}/unpublish. Transitions PUBLISHED → DRAFT. DESIGNER only. */
export async function unpublishListing(token: string, id: string): Promise<MarketplaceListing> {
  const data = await apiFetch<DesignListingApiResponse>(`/api/marketplace/${id}/unpublish`, {
    method: 'PATCH',
    token,
  });
  return toListing(data);
}

/**
 * Maps to POST /api/marketplace/{id}/favorite. A 409 means the backend's
 * own AlreadyFavoritedException fired — on mobile a double-tap can race two
 * of these in flight, so that specific case is swallowed as a no-op rather
 * than surfacing an error toast for something that isn't actually wrong
 * (the listing ends up favorited either way).
 */
export async function addFavorite(token: string, id: string): Promise<void> {
  try {
    await apiFetch<void>(`/api/marketplace/${id}/favorite`, { method: 'POST', token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return;
    throw err;
  }
}

/**
 * Maps to DELETE /api/marketplace/{id}/favorite. Mirrors addFavorite's
 * race handling — a 404 here means the backend's FavoriteNotFoundException
 * fired (already unfavorited by a raced request), which is a no-op, not a
 * real error.
 */
export async function removeFavorite(token: string, id: string): Promise<void> {
  try {
    await apiFetch<void>(`/api/marketplace/${id}/favorite`, { method: 'DELETE', token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}
