'use strict';

// Thin client over the API gateway. Everything the seeder writes goes
// through the real endpoints rather than straight into Postgres, so
// registered accounts get properly hashed passwords and actually log in,
// listing validation runs, and the RabbitMQ events fire the same way they
// would for a human user.

const BASE = process.env.API_BASE || 'http://localhost:8080';

class ApiError extends Error {
  constructor(status, body, path) {
    super(`${status} ${path} — ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

async function parse(res, path) {
  const text = await res.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* keep raw text */ }
  if (!res.ok) throw new ApiError(res.status, body, path);
  return body;
}

async function request(path, { method = 'GET', token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    // Let undici set the multipart boundary itself.
    body = form;
  }
  const res = await fetch(BASE + path, { method, headers, body });
  return parse(res, path);
}

const login = (email, password) =>
  request('/api/auth/login', { method: 'POST', json: { email, password } });

const register = (fullName, email, password, role) =>
  request('/api/auth/register', {
    method: 'POST',
    json: {
      full_name: fullName,
      email,
      password,
      confirm_password: password,
      role,
    },
  });

/** Uploads the model itself; returns the ModelFile row (we need fileId). */
function uploadModelFile(token, buffer, filename, mime) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), filename);
  return request('/api/files/upload', { method: 'POST', token, form });
}

/**
 * Creates the listing. The `thumbnail` part is what the controller pushes
 * to Cloudinary and stores as thumbnailUrl — the same path the real
 * "create listing" screen uses, so seeded rows are indistinguishable from
 * hand-made ones.
 */
function createListing(token, fields, thumbnailPng) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) form.append(k, String(v));
  }
  if (thumbnailPng) {
    form.append('thumbnail', new Blob([thumbnailPng], { type: 'image/png' }), 'thumbnail.png');
  }
  return request('/api/marketplace', { method: 'POST', token, form });
}

const publishListing = (token, id) =>
  request(`/api/marketplace/${id}/publish`, { method: 'PATCH', token });

const createPrinter = (token, printerName, labLocation) =>
  request('/api/printers', {
    method: 'POST', token,
    json: { printer_name: printerName, lab_location: labLocation },
  });

const getAvailablePrinters = (token) =>
  request('/api/printers/available', { method: 'GET', token });

const setPrinterStatus = (token, id, status) =>
  request(`/api/printers/${id}/status`, {
    method: 'PATCH', token, json: { printer_status: status },
  });

const favoriteListing = (token, id) =>
  request(`/api/marketplace/${id}/favorite`, { method: 'POST', token });

/** Uploads an avatar/thumbnail-style image (not a 3D model) — separate endpoint from uploadModelFile. */
function uploadImageFile(token, buffer, filename, mime) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), filename);
  return request('/api/files/upload/image', { method: 'POST', token, form });
}

const updateProfile = (token, fields) =>
  request('/api/auth/profile', { method: 'PATCH', token, json: fields });

const followUser = (token, userId) =>
  request(`/api/users/${userId}/follow`, { method: 'POST', token });

/**
 * Bring-your-own-file estimate — only valid when fileId belongs to the
 * caller (EstimateService enforces this). NOT what marketplace orders need
 * (that file belongs to the designer) — use submitMarketplaceOrder for that.
 */
const createEstimate = (token, { fileId, quality, infillPercent, quantity, materialType }) =>
  request(
    `/api/estimates?fileId=${fileId}&quality=${encodeURIComponent(quality)}`
    + `&infillPercent=${infillPercent}&quantity=${quantity}&materialType=${encodeURIComponent(materialType)}`,
    { method: 'POST', token },
  );

/**
 * Marketplace order submission (POST /api/print-jobs, JSON body) — the
 * *real* path a student uses to order a design. Internally this creates an
 * Estimate against the designer's file with the ownership check correctly
 * skipped (already verified the listing is PUBLISHED first), which the
 * plain /api/estimates endpoint above does not do. Returns
 * OrderAwaitingPaymentResponse — no PrintJob yet, just { estimate, listingId,
 * color, notes } — payment is what would normally gate PrintJob creation
 * (see createRawPrintJob's comment for why we bypass that specific gate).
 */
const submitMarketplaceOrder = (token, { listingId, material, quantity, infill, quality, color, notes }) =>
  request('/api/print-jobs', {
    method: 'POST', token,
    json: {
      listing_id: listingId, material, quantity,
      infill: `${infill}%`, quality, color, notes,
    },
  });

/**
 * ADMIN-only raw job creation (POST /api/job-service/print-jobs) — used
 * instead of the customer-facing order flow because that flow only ever
 * creates a PrintJob from inside PaymentService.handleWebhook(), gated on
 * a real Paystack webhook whose HMAC signature we could forge (we have the
 * secret) but whose payload the backend re-verifies against Paystack's own
 * /transaction/verify API — which has no matching real transaction behind
 * a seeded reference. Every *subsequent* transition (approve/reject/status/
 * transition below) goes through the exact same staff-facing endpoints a
 * human would use, which is where the real notification-firing logic
 * actually lives — this bypass only replaces the unreachable payment gate,
 * not the state machine.
 */
const createRawPrintJob = (adminToken, job) =>
  request('/api/job-service/print-jobs', { method: 'POST', token: adminToken, json: job });

const approveJob = (staffToken, jobId, { printerId, estimatedCost, estimatedTime } = {}) =>
  request(`/api/print-jobs/${jobId}/approve`, {
    method: 'PATCH', token: staffToken,
    json: { printer_id: printerId, estimated_cost: estimatedCost, estimated_time: estimatedTime },
  });

const rejectJob = (staffToken, jobId, reason) =>
  request(`/api/print-jobs/${jobId}/reject`, { method: 'PATCH', token: staffToken, json: { reason } });

/** Free-form status set (query params) — SUBMITTED/APPROVED/QUEUED/PRINTING/COMPLETED/REJECTED, no ordering enforced. */
const setJobStatus = (staffToken, jobId, status, printerId) =>
  request(
    `/api/print-jobs/${jobId}/status?status=${status}${printerId ? `&printerId=${encodeURIComponent(printerId)}` : ''}`,
    { method: 'PATCH', token: staffToken },
  );

/** Strict one-step lifecycle (JSON body) — APPROVED->PRINTING->READY->COLLECTED only. */
const transitionJob = (staffToken, jobId, status) =>
  request(`/api/print-jobs/${jobId}/transition`, { method: 'PATCH', token: staffToken, json: { status } });

module.exports = {
  BASE, ApiError, request,
  login, register,
  uploadModelFile, createListing, publishListing,
  createPrinter, setPrinterStatus, favoriteListing, getAvailablePrinters,
  uploadImageFile, updateProfile, followUser,
  createEstimate, submitMarketplaceOrder, createRawPrintJob,
  approveJob, rejectJob, setJobStatus, transitionJob,
};
