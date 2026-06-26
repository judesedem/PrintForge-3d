# PrintForge 3D — Marketplace Pivot: Status Handoff
**Group 42 | CODEQUEST 2026**
**Date:** June 24, 2026

---

## Overview

This handoff documents what has been fully implemented in the backend as of this zip,
what still needs attention, and exactly what the frontend team needs to build against
the new API.

The backend pivot from a "bring your own STL" system to a marketplace-driven
print-on-demand platform is **complete**. All seven items from the handoff spec have
been implemented. The project should compile and run — the remaining items below are
environment setup, wiring verification, and frontend work.

---

## ✅ What Has Been Completed (Backend)

### 1. DESIGNER Role Added
**File:** `src/main/java/com/printforge/printforge/entity/Role.java`

`DESIGNER` has been added to the Role enum alongside `STUDENT`, `LAB_STAFF`, and `ADMIN`.
The role is enforced via `@PreAuthorize("hasRole('DESIGNER')")` on all designer-only
marketplace endpoints. Customers register as `STUDENT`; designers register as `DESIGNER`.

---

### 2. Cloudinary File Storage (Replaces Local Disk)
**Files changed:**
- `pom.xml` — `cloudinary-http44` v1.38.0 dependency added
- `src/main/resources/application.properties` — Cloudinary credentials block added,
  `app.upload.dir` removed
- `config/CloudinaryConfig.java` — **NEW** — Spring `@Bean` that wires the Cloudinary
  SDK from the three environment variables below
- `fileservice/storage/FileStorageService.java` — **Fully replaced** — `store()` now
  uploads to Cloudinary and returns a public HTTPS URL; `load()` wraps the URL as a
  `UrlResource` for backward compat
- `fileservice/service/FileService.java` — `saveFileMetadata()` updated to store the
  Cloudinary URL in both `storedFilename` and `fileUrl` in a single save (no second pass)

**Environment variables that MUST be set before running:**
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
Get these from your Cloudinary dashboard → Settings → API Keys. The app will start
without them (using the placeholder fallback strings) but every file upload will fail
until real credentials are in place.

---

### 3. Marketplace Service — Full Implementation
**New package:** `com.printforge.printforge.marketplaceservice`

**New files:**
- `marketplaceservice/model/DesignListing.java` — Entity with all fields from the spec:
  `id`, `fileId`, `designerId`, `title`, `description`, `basePrice`, `thumbnailUrl`,
  `status` (DRAFT/PUBLISHED), `createdAt`, `publishedAt`, `totalOrders`, `totalEarnings`
- `marketplaceservice/repository/DesignListingRepository.java` — JPA repository with
  `findByStatus()`, `findByDesignerId()`, `existsByFileId()`, and a JPQL
  `sumEarningsByDesigner()` query used by the admin dashboard
- `marketplaceservice/exception/ListingNotFoundException.java` — 404 guard
- `marketplaceservice/exception/ListingNotPublishedException.java` — guard when a
  customer tries to order an unpublished listing
- `marketplaceservice/controller/MarketplaceController.java` — All 8 endpoints:

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/marketplace` | Any authenticated | Public storefront (PUBLISHED only) |
| GET | `/api/marketplace/{id}` | Any authenticated | Listing detail + auto quote |
| GET | `/api/marketplace/my-listings` | DESIGNER | Own listings (DRAFT + PUBLISHED) |
| POST | `/api/marketplace` | DESIGNER | Create listing as DRAFT |
| PATCH | `/api/marketplace/{id}` | DESIGNER (owner) | Update title/description/price |
| PATCH | `/api/marketplace/{id}/publish` | DESIGNER (owner) | DRAFT → PUBLISHED |
| PATCH | `/api/marketplace/{id}/unpublish` | DESIGNER (owner) | PUBLISHED → DRAFT |
| DELETE | `/api/marketplace/{id}` | DESIGNER (owner) | Delete DRAFT with no orders |

`GET /api/marketplace/{id}` auto-calls `EstimateService` with default params (Standard,
20% infill, qty 1, PLA) and adds the listing's `base_price` on top. The combined quote
is returned in the response body alongside the listing so the customer sees the full
cost before placing an order.

Thumbnail upload in `POST /api/marketplace` calls `fileStorageService.store()` directly
and saves the returned Cloudinary URL into `DesignListing.thumbnailUrl`. Thumbnails
don't get a `model_files` row — they are display assets only.

---

### 4. Status Values Normalized to UPPERCASE
**Files changed:**
- `queueservice/model/PrintJob.java` — `@PrePersist` sets initial status to `"SUBMITTED"`
- `queueservice/service/PrintQueueService.java` — valid status set is now
  `{"SUBMITTED", "APPROVED", "QUEUED", "PRINTING", "COMPLETED", "REJECTED"}`
- `facade/PrintJobFacadeController.java` — `approveJob()` passes `"APPROVED"`,
  `rejectJob()` passes `"REJECTED"` to `updateJobStatus()`

The full status flow is: `SUBMITTED → APPROVED → QUEUED → PRINTING → COMPLETED`
with a branch to `REJECTED` from any pre-completion state.

---

### 5. PrintJobFacadeController — Rewired for Marketplace
**File:** `facade/PrintJobFacadeController.java`

Two distinct endpoints now exist:

**`POST /api/print-jobs` (JSON body)** — Marketplace order flow:
1. Looks up the `DesignListing` by `listing_id` — 404 if missing, 403 if not PUBLISHED
2. Gets `file_id` from the listing (no file upload from the customer)
3. Reuses `estimate_id` from the request body if valid and owned by the caller,
   otherwise recalculates a fresh estimate
4. Adds the listing's `base_price` on top of the machine + material cost
5. Saves the `PrintJob` with `fileId`, `estimateId`, `userId` from JWT
6. Increments `totalOrders` and `totalEarnings` on the listing
7. Sends the customer an "Order Submitted" notification

**`POST /api/print-jobs/upload` (multipart)** — Backward-compatible bring-your-own-file
path for any existing screens that still upload their own STL.

---

### 6. Auto-Notifications on Status Changes
**File:** `queueservice/service/PrintQueueService.java`

`NotificationService` is now injected into `PrintQueueService`. After every call to
`updateJobStatus()`, a notification is automatically sent based on the new status:
- `PRINTING` → "Print Started" (info)
- `COMPLETED` → "Print Complete" (success)
- `REJECTED` → "Job Rejected" (error)

This closes the Phase 4 communication loop — operators no longer need to manually
trigger anything; every status change via `PATCH /api/print-jobs/{id}/status`
automatically pings the customer.

---

### 7. Designer Earnings Tracking
**Files changed:**
- `marketplaceservice/model/DesignListing.java` — `totalOrders` (INT) and
  `totalEarnings` (DECIMAL) fields added with defaults of 0
- `facade/PrintJobFacadeController.java` — increments both fields after each
  confirmed marketplace order save
- `adminservice/service/AdminService.java` — `getDashboardSummary()` now calls
  `designListingRepository.sumEarningsByDesigner()` and joins with `UserRepository`
  to return designer names alongside totals
- `adminservice/controller/AdminController.java` — the existing `GET /api/admin/dashboard`
  response now includes the `designer_earnings` array

`GET /api/marketplace/my-listings` returns all listing fields including `total_orders`
and `total_earnings` so the designer dashboard can show earnings per listing.

`GET /api/admin/dashboard` now includes:
```json
"designer_earnings": [
  { "designer_name": "John Yeboah", "total_owed": 60.00 },
  { "designer_name": "Gareth Edu",  "total_owed": 32.50 }
]
```

---

## ⚠️ Remaining Backend Items (Before Demo)

### A. Cloudinary Credentials — REQUIRED
The app will start but all uploads will fail until real credentials are set.

Option 1 — Environment variables (recommended):
```bash
export CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
export CLOUDINARY_API_KEY=your_actual_api_key
export CLOUDINARY_API_SECRET=your_actual_api_secret
```

Option 2 — Edit `application.properties` directly (do NOT commit to git):
```properties
cloudinary.cloud-name=your_actual_cloud_name
cloudinary.api-key=your_actual_api_key
cloudinary.api-secret=your_actual_api_secret
```

Sign up at https://cloudinary.com — free tier gives 25GB storage and 25GB bandwidth,
more than sufficient for CodeQuest.

### B. SecurityConfig — Marketplace Endpoint Visibility
**File:** `config/SecurityConfig.java`

Currently all requests except `/api/auth/**` require authentication. The handoff spec
says `GET /api/marketplace` should be accessible to all authenticated users, which is
already satisfied. However if the team decides to make the storefront publicly browsable
(no login required), add this line to the `authorizeHttpRequests` block:
```java
.requestMatchers(HttpMethod.GET, "/api/marketplace", "/api/marketplace/**").permitAll()
```
This is a one-liner but was left as a deliberate decision for the team — the spec
says "any authenticated user", so a logged-in requirement is currently correct.

### C. CORS — Add Your Device IP
If testing on a physical phone on the same Wi-Fi, add your machine's local IP to
`application.properties`:
```properties
app.cors.allowed-origins=http://localhost:8081,http://localhost:19006,http://192.168.x.x:8081
```

### D. Database
Hibernate `ddl-auto=update` will create the new `design_listings` table automatically
on first startup. No manual migration needed. Existing `print_jobs`, `model_files`,
and `users` tables are untouched.

---

## 📱 What the Frontend Needs to Build

The backend API is ready. Below is the complete spec for each new frontend screen,
including the exact endpoints and request/response shapes.

---

### Screen 1 — Storefront (Customer)

**Endpoint:** `GET /api/marketplace`
**Auth:** Bearer token required (any role)

**Response:**
```json
[
  {
    "id": 7,
    "title": "Articulated Dragon",
    "description": "A fully articulated dragon model...",
    "basePrice": 5.00,
    "thumbnailUrl": "https://res.cloudinary.com/...",
    "status": "PUBLISHED",
    "designerId": 3,
    "createdAt": "2026-06-20T10:00:00",
    "publishedAt": "2026-06-21T09:30:00",
    "totalOrders": 12,
    "totalEarnings": 60.00
  }
]
```

**UI notes:**
- Grid or list of cards, each showing `title`, `thumbnailUrl` (use directly in
  `<Image source={{ uri: item.thumbnailUrl }}/>`), and `basePrice`
- Tapping a card navigates to the Listing Detail screen with the listing `id`
- `totalOrders` and `totalEarnings` should NOT be shown to customers on this screen
  (they're for the designer dashboard)

---

### Screen 2 — Listing Detail + Quote (Customer)

**Endpoint:** `GET /api/marketplace/{id}`
**Auth:** Bearer token required

**Response:**
```json
{
  "listing": { ...full listing object... },
  "quote": {
    "id": 42,
    "totalCost": 18.50,
    "durationMinutes": 95.0,
    "material": "PLA",
    "quality": "STANDARD",
    "infillPercent": 20,
    "quantity": 1
  }
}
```

**UI notes:**
- Show the thumbnail, title, description, and the quote's `totalCost` as the
  displayed price (this already includes `base_price` + machine + material)
- Add material selector (PLA / ABS / Resin), quantity stepper, and quality selector.
  When these change, re-fetch the listing detail — the quote will update because the
  customer-facing quote is recalculated on the server on each `GET /{id}` call.
  Alternatively, call `POST /api/estimate` directly with the selected params for a
  live quote without a full page refresh.
- "Order Now" button calls `POST /api/print-jobs` (see below)
- If `quote` is `null` or `quote_error` is present, show "Quote unavailable" — the
  designer may not have attached a model file to the listing yet

---

### Screen 3 — Place Order (Customer)

**Endpoint:** `POST /api/print-jobs`
**Auth:** Bearer token
**Content-Type:** `application/json`

**Request body:**
```json
{
  "listing_id": 7,
  "material": "PLA",
  "color": "Black",
  "quantity": 2,
  "infill": "20%",
  "quality": "Standard",
  "notes": "Please make it extra clean on the wings",
  "estimate_id": 42
}
```

- `estimate_id` is optional — pass it if you have one from the detail screen to avoid
  recalculating. If omitted or invalid, the backend recalculates automatically.
- On success (200), navigate to Order Confirmation or Job Status screen

**Error cases to handle:**
- `404` — listing not found
- `403` — listing exists but is not PUBLISHED (show "This item is no longer available")
- `400` — validation error

---

### Screen 4 — Designer Dashboard (DESIGNER role only)

**Endpoint:** `GET /api/marketplace/my-listings`
**Auth:** Bearer token (DESIGNER role)

**Response:**
```json
[
  {
    "id": 7,
    "title": "Articulated Dragon",
    "status": "PUBLISHED",
    "basePrice": 5.00,
    "totalOrders": 12,
    "totalEarnings": 60.00,
    "thumbnailUrl": "https://res.cloudinary.com/...",
    ...
  }
]
```

**UI — each listing card shows:**
```
Articulated Dragon          [PUBLISHED]
GH₵ 5.00 per order
12 orders · GH₵ 60.00 earned

[Unpublish]  [Edit]  [Delete]
```

For DRAFT listings, show `[Publish]` instead of `[Unpublish]`.

**Create Listing button** → calls `POST /api/marketplace` as `multipart/form-data`:
```
file_id      (Long)        — ID of a previously uploaded model file
title        (String)
description  (String, optional)
base_price   (Decimal)
thumbnail    (file, optional) — image file, uploaded directly to Cloudinary
```

**Publish/Unpublish:**
- `PATCH /api/marketplace/{id}/publish`
- `PATCH /api/marketplace/{id}/unpublish`
- No request body needed, just the path and auth header

**Edit:**
- `PATCH /api/marketplace/{id}` with JSON body containing any subset of
  `{ "title", "description", "base_price" }`

**Delete:**
- `DELETE /api/marketplace/{id}`
- Only works for DRAFT listings with 0 orders — backend will 500 otherwise;
  disable the Delete button if `status == "PUBLISHED"` or `totalOrders > 0`

---

### Screen 5 — Job Status Updates (All Customers)

**Status badge changes:** Every place a job status is displayed must now use uppercase:

| Old (wrong) | New (correct) |
|-------------|---------------|
| `submitted` | `SUBMITTED` |
| `approved`  | `APPROVED`  |
| `queued`    | `QUEUED`    |
| `printing`  | `PRINTING`  |
| `completed` | `COMPLETED` |
| `rejected`  | `REJECTED`  |

String comparisons in your switch/if statements, badge color mappings, and display
labels all need to change. Search the frontend codebase for any of the lowercase
status strings and replace them.

---

### Screen 6 — Admin Dashboard (LAB_STAFF / ADMIN role)

**Endpoint:** `GET /api/admin/dashboard` — already existed, now includes earnings

The response now includes a `designer_earnings` array. Add a section to the existing
admin dashboard UI:

```
Designer Payouts (This Period)
─────────────────────────────
John Yeboah          GH₵ 60.00
Gareth Edu           GH₵ 32.50
```

This is a read-only summary — actual payment happens offline (cash/MoMo).

---

## File Upload Flow (Designer)

The flow for a designer listing a model is two steps:

1. **Upload the STL file** — `POST /api/files/upload` (existing endpoint, multipart)
   → returns `{ fileId, fileUrl, ... }`
2. **Create the listing** — `POST /api/marketplace` with `file_id` from step 1,
   title, description, base_price, and optionally a `thumbnail` image file

The thumbnail is a separate image file (PNG/JPG), not the STL. It is what customers
see in the storefront grid. If no thumbnail is uploaded, the card should show a
placeholder 3D print icon.

---

## Summary Table

| Item | Backend Status | Frontend Status |
|------|---------------|-----------------|
| DESIGNER role | ✅ Done | ✅ Pass to register endpoint |
| Cloudinary storage | ✅ Done | ✅ Use `thumbnail_url` directly in `<Image>` |
| Marketplace storefront | ✅ Done | ⬜ Build Screen 1 |
| Listing detail + quote | ✅ Done | ⬜ Build Screen 2 |
| Place marketplace order | ✅ Done | ⬜ Build Screen 3 |
| Designer dashboard | ✅ Done | ⬜ Build Screen 4 |
| Uppercase status values | ✅ Done | ⬜ Update all status strings/badges |
| Auto notifications | ✅ Done | ✅ Already consuming notifications |
| Designer earnings | ✅ Done | ⬜ Add to designer dashboard (Screen 4) |
| Admin earnings summary | ✅ Done | ⬜ Add section to admin dashboard |
| Cloudinary credentials | ⬜ Need real values | — |

---

*Generated by the backend team after completing the marketplace pivot. Hand this file
to the frontend team alongside the updated zip.*
