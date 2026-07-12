# PrintForge RN ↔ Backend Integration — Handoff

## Process note

After each fix or phase of work below, append a short entry to a
**"Progress Log"** section at the bottom of this file: what was done, what
was verified (or not — e.g. "written but not yet run against a live
backend"), and what's next. Keep entries brief — a few lines each — this
file is meant to stay skimmable, not become a second changelog.

## Where things stand

- **Backend (`printforge`, Spring Boot):** real, working, well-documented. Auth,
  files, printers, print-jobs, queue, marketplace, payments, notifications,
  estimates, and admin all have controller/service/repository layers.
  `POST /api/auth/firebase` already exchanges a Firebase ID token for a
  PrintForge JWT — see `FIREBASE_AUTH_INTEGRATION_HANDOFF.md`.
- **Frontend (`PrintForge-RN-Final`, Expo Router + TS + Nativewind):** UI/nav
  shell is in good shape, but there is **no API layer at all** — no `fetch`,
  no `axios`, no client. Every data screen reads from `src/data/mockData.ts`.
  Firebase Google sign-in works client-side but is never exchanged for a
  PrintForge JWT, so no authenticated request is possible today.

This doc sequences the work needed to close that gap. Each phase depends on
the one before it — don't skip ahead to Phase 3 without Phase 1 done, or
you'll be wiring screens to a session that doesn't exist yet.

---

## Phase 0 — Setup (do first, ~30 min)

- [ ] Confirm the backend runs locally and note its base URL (`http://localhost:8080`
      or whatever `application.properties` / your run config uses).
- [ ] Run `./mvnw compile` and `./mvnw test -Dtest=AuthServiceTest` on the
      backend — the Firebase auth handoff doc flags this was never actually
      compiled in the sandbox it was built in. Don't build on top of it until
      you've confirmed `BUILD SUCCESS`.
- [ ] Add an env var for the API base URL to the RN app (`.env` /
      `EXPO_PUBLIC_API_URL`), following the same pattern already used for the
      Firebase config vars in `src/firebase.ts`.

---

## Phase 1 — Auth: close the Firebase → PrintForge JWT gap

This unblocks everything else, since every other endpoint requires a JWT.

- [ ] **Create an API client module** (e.g. `src/api/client.ts`): a thin
      wrapper around `fetch` that knows the base URL, attaches
      `Authorization: Bearer <token>` when a token is present, and throws on
      non-2xx responses. Everything else calls through this, not raw `fetch`.
- [ ] **Create a token store.** Use `expo-secure-store` (not AsyncStorage) to
      persist the PrintForge JWT across app restarts.
- [ ] **Wire `SessionContext`:** after `signInWithGoogle` succeeds and you
      have a `firebaseUser`, call
      `firebaseUser.getIdToken()` → `POST /api/auth/firebase { idToken }`
      → store the returned `{ token, user }`. Right now this call is
      missing entirely — the flow currently stops at "Firebase signed in."
- [ ] **Load session on app start:** on mount, check secure storage for an
      existing token; if present, validate/refresh via `GET /api/auth/me`
      rather than trusting a stale token indefinitely.
- [ ] **Wire sign-out:** clear the stored PrintForge token alongside the
      existing `firebaseSignOut` call.
- [ ] **Decide on email/password too:** the backend has `/api/auth/register`
      and `/api/auth/login` independent of Firebase. Confirm whether the RN
      app needs these (the current `(auth)/login.tsx` and `register.tsx`
      screens exist — check whether they currently call anything, or are also
      mock/dead-end screens like the rest of the app).

**Done when:** signing in with Google produces a stored PrintForge JWT, and
`GET /api/auth/me` with that token returns the right user.

---

## Phase 2 — Data layer: replace mock reads with real endpoints

Do these roughly in the order below — each maps to a known backend
controller, so there's no guessing involved. Suggested priority is
"whatever the app's primary flow is" first (jobs, since that's likely the
core loop), then marketplace, then the rest.

| Area | Frontend files using mock data | Backend endpoints available |
|---|---|---|
| **Print jobs** | `app/jobs/index.tsx`, `app/jobs/[id].tsx`, `src/JobsContext.tsx`, `src/components/JobCard.tsx` | `POST /api/print-jobs`, `POST /api/print-jobs/upload`, `GET /api/print-jobs`, `GET /api/print-jobs/{jobId}` (facade), plus `queueservice` on the same `/api/print-jobs` base |
| **Marketplace** | `app/(app)/(tabs)/marketplace/index.tsx`, `app/(app)/marketplace/[id].tsx`, `src/components/ListingCard.tsx` | `GET /api/marketplace`, `GET /api/marketplace/{id}`, `GET /api/marketplace/my-listings`, `GET /api/marketplace/my-earnings`, `POST /api/marketplace`, `DELETE /api/marketplace/{id}` |
| **Staff queue** | `app/staff/queue.tsx` | `queueservice/PrintQueueController` on `/api/print-jobs` |
| **Admin** | `app/admin/index.tsx` | `POST /api/admin/users`, `GET /api/admin/dashboard` |
| **Notifications** | `app/(app)/(tabs)/notifications.tsx` (or `app/(app)/notifications.tsx`) | `GET /api/notifications`, `GET /api/notifications/user/{userId}`, `GET /api/notifications/user/{userId}/unread/count`, `POST /api/notifications/push-token` |
| **Payments** | not yet in frontend at all | `POST /api/payments/initiate`, `POST /api/payments/{id}/retry`, `GET /api/payments/{id}`, `GET /api/payments/my-payments` |
| **Files** | tied into job creation flow | `POST /api/files/upload`, `GET /api/files/{id}`, `GET /api/files/{id}/download`, `GET /api/files` |
| **Printers / materials / estimates** | `src/components/PrinterDot.tsx`, designer dashboard | `GET /api/printers`, `GET /api/printers/available`, `GET /api/materials`, `POST /api/estimates`, `GET /api/estimates/{id}` |

For each screen:
- [ ] Confirm the actual response shape by reading the corresponding
      backend DTO/model (don't assume it matches `mockData.ts` — that file
      was written for the UI restyle, not against the real API).
- [ ] Replace the mock import with a data-fetching hook (plain `useEffect` +
      `useState`, or introduce React Query if you want caching/retry — worth
      deciding once, not per-screen).
- [ ] Keep loading/error states — none of the current screens have them,
      since mock data is always "already there."
- [ ] Replace `JobsContext.updateJob`'s local-only mutation with a real
      `PUT`/`PATCH` call, then update local state from the response (not
      optimistically only).

**Done when:** `mockData.ts` has no remaining importers, or is explicitly
kept only as fixtures for tests/storybook.

---

## Phase 3 — Cleanup / hardening

- [ ] Remove `src/data/mockData.ts` imports once every screen is wired (or
      isolate it clearly as test fixtures if you want to keep it).
- [ ] Add a global error boundary / toast for failed API calls — right now
      there's no precedent for surfacing a network failure to the user.
- [ ] Confirm token expiry handling: what happens when a JWT expires mid-session?
      (Backend handoff docs don't mention refresh tokens — check `JwtService`
      for expiry length and decide if silent re-auth via Firebase is needed.)
- [ ] Add `authProvider` to the login screen state if you want to show
      "signed in with Google" in the profile screen — flagged as a known gap
      in the backend's own handoff doc, not yet exposed via `/api/auth/me`.

---

## Known backend gaps worth knowing before you build against it

Pulled directly from the backend's own handoff docs — not things you need to
fix, just things to design around:

- Apple sign-in claim handling exists server-side but nothing calls it yet
  (no Apple Developer account) — don't build an Apple sign-in button
  expecting it to work end-to-end.
- Firebase-created accounts get a random unusable password under the hood
  (to satisfy a `NOT NULL` column) — irrelevant to the frontend, but don't be
  surprised if you see a `password` field on the user in the DB.
- Account linking (Google email matching an existing local account) happens
  silently, no confirmation step. Fine for now, but if you ever add a
  "link account" UI, know that the merge already happens automatically today.

---

## Progress Log

### 2026-07-11 — Backend sanity check + stale test fix
- **Done:** ran `./mvnw compile` (succeeded) and `./mvnw test -Dtest=AuthServiceTest`
  on the backend. Compile was clean. 2 of 4 tests failed — turned out to be
  unrelated to the Firebase work: `resolveRole()` correctly blocks self-registering
  as `ADMIN`/`LAB_STAFF`, but two tests still asserted the old (pre-restriction)
  behavior. Rewrote those two tests to assert the rejection instead, removed the
  now-unused `AuthResponse` import, updated the stale class Javadoc.
- **Verified:** logic reviewed against `AuthService.resolveRole()`; not yet
  re-run against a live `./mvnw test` by me (I can't run Maven in this sandbox) —
  user confirmed it passed after applying the fix.
- **Next:** Phase 1, auth wiring (below).

### 2026-07-11 — Phase 1: Firebase → PrintForge JWT wiring
- **Done:** created `src/api/client.ts` (fetch wrapper: base URL from
  `EXPO_PUBLIC_API_URL`, Bearer token injection, `ApiError` with status +
  message parsed from the backend's `ErrorResponse` shape), `src/api/types.ts`
  (TS mirrors of `AuthResponse`/`UserDto`/`ErrorResponse`), `src/api/auth.ts`
  (`loginWithFirebase`, `getCurrentUser`, `logout` — map 1:1 to
  `/api/auth/firebase`, `/api/auth/me`, `/api/auth/logout`), and
  `src/authStorage.ts` (JWT persistence via `expo-secure-store`, not
  AsyncStorage, since it's a bearer token).
- Rewrote `SessionContext.tsx`: `signInWithGoogle` now calls
  `firebaseUser.getIdToken()` → `loginWithFirebase()` → stores the returned
  JWT → exposes `appUser` (real `UserDto` from the backend) and `token`.
  Session is restored on app start via `GET /api/auth/me` if a token is
  already stored (and cleared if it's expired/invalid). `signOut` clears
  the stored token and calls the backend's logout endpoint (best-effort).
- Kept a derived `role` field (`appUser?.role ?? 'student'`) on the context
  for backward compatibility with `dashboard/index.tsx`, which routes on it.
- Added `EXPO_PUBLIC_API_URL` to `.env.example`.
- **Not done / blocker found:** `app/(auth)/login.tsx` and
  `app/(auth)/register.tsx` both destructure `setRole` from `useSession()` to
  fake a role picker — that function no longer exists on the new context
  (role now comes from the backend, not something the client can set for
  itself). Those two screens will throw until they're updated. This also
  ties into the still-open question from Phase 1: whether the app keeps a
  local email/password flow at all, or funnels everyone through Firebase.
  **Needs a decision before those two screens can be fixed.**
- **Verified:** not yet run against a live backend/device by me — written
  against the DTO shapes read directly from the backend source
  (`AuthResponse`, `UserDto`, `FirebaseLoginRequest`, `AuthController`), but
  needs a real run to confirm.
- **Next:** decide the fate of `login.tsx`/`register.tsx` (see blocker above),
  then continue with Phase 2 — jobs screen wiring.

### 2026-07-11 — Phase 2: jobs screen wiring
- **Found a real backend gap first:** the facade's `PrintJobResponse` DTO
  comment claimed it matched "the exact shape the frontend's PrintJob
  TypeScript interface expects," but the actual frontend `Job` type (in
  `mockData.ts`) uses different field names throughout, and two fields
  displayed on-screen — `job.quality` and `job.tracking` — had no backend
  equivalent returned at all (the `PrintJob` entity has `quality` and
  `shippingTrackingNumber`, but `toResponse()` never included them).
- **Backend fix:** added `quality` and `tracking_number` to
  `PrintJobResponse` + populated them in `PrintJobFacadeController.toResponse()`.
  Small, additive change — no existing fields touched.
- **Frontend:** added `src/api/jobs.ts` — raw `PrintJobApiResponse` type
  (mirrors the backend DTO exactly, snake_case), `fetchJobs`/`fetchJob`
  calling `GET /api/print-jobs` and `GET /api/print-jobs/{id}`, and a
  `toJob()` adapter mapping the backend response onto the frontend's
  existing `Job` shape — this means `JobCard`, `StatusBadge`,
  `dashboard/student.tsx`, `profile.tsx`, and `staff/queue.tsx` all keep
  working unchanged, since they only ever read `Job`, not the raw API shape.
  Also stubbed `approveJob`/`rejectJob` (staff-only endpoints) — not yet
  called from any screen.
- Rewrote `JobsContext.tsx` to fetch from `GET /api/print-jobs` using the
  session token from `SessionContext`, instead of holding the static
  `INITIAL_JOBS` mock array. Exposes `loading`/`error`/`refetch` now, in
  addition to `jobs`. Waits for `SessionContext`'s `authLoading` to resolve
  before fetching, so it doesn't fire once with no token on every app start.
- **Bug caught before it shipped:** `app/jobs/[id].tsx` used
  `jobs.find(...) ?? jobs[0]` as a fallback — harmless with mock data
  (array was never empty) but would crash on `job.status` once `jobs` can
  legitimately be empty (while loading, or a genuinely job-less account).
  Patched in a loading/not-found guard.
- **Not done:** `staff/queue.tsx` still reads real `jobs` now (via the same
  context) but its approve/reject actions are still local-only — that
  screen needs its own wiring pass to call the new `approveJob`/`rejectJob`
  functions. `jobs/index.tsx` and the other three consumers show an empty
  state while loading rather than a loading skeleton — cosmetic, not
  incorrect, but worth a follow-up.
- **Verified:** not run against a live backend by me (same sandbox
  limitation as before) — mappings are written directly against the
  backend source (entity fields, DTO, controller), but needs a real
  device/simulator run to confirm end-to-end.
- **Next:** either wire `staff/queue.tsx`'s approve/reject actions (small,
  since `approveJob`/`rejectJob` already exist), or move to marketplace
  screens per the original phase plan — your call.

### 2026-07-11 — Auth blocker resolved: real email/password login + register
- **Decision made** (was the open blocker from the last entry): kept the
  email/password fields on `login.tsx`/`register.tsx` — they're backed by
  real backend endpoints (`/api/auth/login`, `/api/auth/register`), not
  placeholders, so wiring them for real was less churn than ripping them
  out in favor of Google-only. Ditched the fake role-picker on `login.tsx`
  entirely (role is server-determined, always was going to be wrong info
  on that screen) and cut `register.tsx`'s role picker down to
  Student/Designer only, since `AuthService.resolveRole()` rejects
  self-registration as `LAB_STAFF`/`ADMIN` (staff/admin accounts are
  admin-provisioned via `POST /api/admin/users`). Also dropped the
  decorative "Student or staff ID" field on `register.tsx` — no matching
  column on `User`, so it was never going anywhere.
- **Backend:** none — no backend changes needed, endpoints already existed
  and matched what the frontend needed.
- **Frontend:**
  - `src/api/types.ts`: added `RegisterPayload`, `LoginPayload`,
    `SelfRegisterRole` ('STUDENT' | 'DESIGNER' only, by design).
  - `src/api/auth.ts`: added `register()`/`login()`, mapping 1:1 to the
    two endpoints.
  - `src/SessionContext.tsx`: added `login`/`register` methods alongside
    `signInWithGoogle`. Unlike the Google flow (which swallows errors
    since "user cancelled the picker" is a normal outcome), these
    **rethrow** `ApiError` so the form can render the backend's actual
    message (bad credentials, duplicate email, etc.) instead of failing
    silently.
  - `login.tsx`: real controlled email/password inputs, inline error
    banner, submit spinner, calls `session.login()`. No role picker —
    routes to `/(app)/(tabs)` and lets `dashboard/index.tsx` redirect
    based on the real `UserDto.role` that comes back.
  - `register.tsx`: same pattern — controlled inputs, client-side
    validation (password length, confirm-password match) before hitting
    the network, role picker limited to Student/Designer, calls
    `session.register()`.
- **Bug caught while wiring this:** `dashboard/index.tsx` compared
  `role === 'staff'` to decide whether to redirect to `/staff/queue`, but
  `UserDto.role` is the backend `Role` enum name lowercased
  (`AuthService.toUserDto()`), so a lab staff account's role is actually
  `'lab_staff'`. Every real staff login would've silently fallen through
  to the student dashboard instead of redirecting. Fixed the comparison;
  flagging here since it wasn't visible in the mock-data era (nothing was
  ever a real backend user before now).
- **Verified:** not run against a live backend/device — no RN toolchain
  in this sandbox — but did run `tsc --noEmit` (jsx: react-native) against
  every touched file and confirmed zero type/syntax errors beyond expected
  implicit-`any` noise from missing `@types/react-native` in the throwaway
  check environment.
- **Next:** wire `staff/queue.tsx`'s approve/reject actions (still local-
  only per the previous entry), or move to marketplace screens per the
  original phase plan.

