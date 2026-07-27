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

const setPrinterStatus = (token, id, status) =>
  request(`/api/printers/${id}/status`, {
    method: 'PATCH', token, json: { printer_status: status },
  });

const favoriteListing = (token, id) =>
  request(`/api/marketplace/${id}/favorite`, { method: 'POST', token });

module.exports = {
  BASE, ApiError, request,
  login, register,
  uploadModelFile, createListing, publishListing,
  createPrinter, setPrinterStatus, favoriteListing,
};
