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

### 2026-07-14 — Notifications: wired to the real backend, mock data removed
- **Found the backend source in this workspace** (`backend/printforge/...notificationservice/`),
  so the response shape below is read directly from `NotificationController.java`,
  `Notification.java` (the JPA entity), and `NotificationService.java` — not
  guessed from `mockData.ts`.
- **Created `src/api/notifications.ts`**, following `jobs.ts`'s conventions:
  - `NotificationApiResponse` (wire shape) + `Notification` (clean frontend
    shape) + `toNotification()` adapter.
  - `fetchNotifications(token)` → `GET /api/notifications`.
  - `fetchUnreadCount(token, userId)` → `GET /api/notifications/user/{userId}/unread/count`.
  - `registerPushToken(token, pushToken)` → `POST /api/notifications/push-token`.
- **Assumption/decision — endpoint shape differs from the task's literal
  example, deliberately:** the task's starting point assumed
  `GET /api/notifications/user/{userId}` for the list, mirroring
  `/api/auth/me`'s "check whether this project derives the user from the
  JWT alone" instruction. Having found the real controller, `getMyNotifications()`
  already does exactly that — it's mapped to the bare `GET /api/notifications`
  route and resolves the caller from `Authentication`, with the controller's
  own comment stating `/user/{userId}` is "kept for backward compatibility
  with existing controller tests." So `fetchNotifications` calls the bare
  route. There is, however, no JWT-only route for the unread count (only
  `/user/{userId}/unread/count` exists), so `fetchUnreadCount` takes
  `userId` as an explicit second argument rather than deriving it — the
  screen passes `appUser.user_id` from `useSession()`. This is a narrower
  deviation from the task's literal `fetchUnreadCount(token)` signature,
  made because the backend genuinely requires it.
- **Verified vs. assumed:** the response field names/types
  (`id: number`, `userId: number`, `title`, `message`, `type: string`,
  `read: boolean`, `createdAt: string`) are read directly from the entity
  and controller, not guessed — but note there's no DTO layer here (unlike
  jobs' `PrintJobResponse`), so this returns the JPA entity as-is over the
  wire. That means field names follow Jackson's default bean-property
  rules rather than an explicit mapping: `isRead()` serializes as `"read"`
  (Jackson drops the `is` prefix), and `createdAt` (a `LocalDateTime`)
  serializes as an ISO-8601 string under Spring Boot's default Jackson
  config (`WRITE_DATES_AS_TIMESTAMPS` disabled by default via the
  auto-configured `JavaTimeModule`). Both of these are standard, well-
  documented Jackson/Spring Boot defaults, not runtime-confirmed against a
  live server in this sandbox — flagged as the one assumption worth a real
  Postman/device check, same caveat as every other unverified entry above.
  `type` is documented in `Notification.java`'s comment as free text
  (examples: `"ORDER_UPDATE"`, `"SYSTEM_ALERT"`, `"PROMO"`), not a closed
  enum — the frontend treats it as an open string and falls back
  gracefully for unrecognized values.
- **Created `app/(app)/(tabs)/notifications.tsx`** — the screen that
  `app/(app)/notifications.tsx` was already importing but didn't exist
  (confirmed missing during the earlier investigation pass). Uses
  `useSession()` for `token`/`appUser`, fetches via the new API module with
  a `JobsContext`-style load pattern (waits for `authLoading`, sets
  `loading`/`error`, `useCallback` + `useEffect`), shows loading/empty/error
  states, and a per-item unread indicator. Visual style matches
  `orders.tsx`/`submit.tsx` (`Card`, `designTokens`, `makeStyles(colors)`
  pattern). `app/(app)/notifications.tsx`'s existing import now resolves.
- **Flagged assumption — possible route collision, not runtime-verified:**
  `app/(app)/(tabs)/notifications.tsx` sits inside the `(tabs)` route group
  only so `app/(app)/notifications.tsx` can import it as a plain component
  (same reuse pattern as `(tabs)/orders.tsx` re-exporting `app/jobs/index.tsx`).
  It's deliberately left out of `(tabs)/_layout.tsx`'s `PAGES` array so it
  isn't swiped-to as a tab. But since `(app)` and `(tabs)` are both
  parenthesized route groups, this file and `app/(app)/notifications.tsx`
  both flatten to the URL `/notifications` — expo-router's file-based
  router may treat that as a duplicate route. Couldn't run Metro/expo-router
  in this sandbox to confirm either way. **If a duplicate-route warning or
  error shows up on a real run**, move this file out of `(tabs)` (e.g. to
  `src/screens/NotificationsScreen.tsx`) and update the import in
  `app/(app)/notifications.tsx`.
- **Removed `mockData.ts`'s `NOTIFICATIONS` array and `Notification` type**
  — confirmed orphaned before removal (zero importers anywhere in the app,
  re-checked after adding the new screen/API module to make sure neither
  referenced the mock version).
- **Not done:** `markAsRead`/`markAllAsRead` — the backend has
  `PATCH /{notificationId}/read`, `PATCH /read-all`, and
  `PATCH /user/{userId}/read-all`, but the task scope only asked for
  fetch/unread-count/push-token, so the new screen is read-only (no tap-to-
  mark-read). Natural follow-up once someone wants that interaction.
  `registerPushToken` is also defined but not called from anywhere yet —
  no `expo-notifications` dependency or push-registration flow exists in
  this app yet (checked `package.json`, confirmed absent), so there's
  nowhere to plug it in until that's built.
- **Verified:** ran `npx tsc --noEmit` against the whole project — the only
  errors on the two new files are pre-existing "Cannot find module"
  failures from `node_modules` not being installed in this sandbox (every
  other file in the project shows the same errors for the same reason);
  zero type errors specific to the new code. Not run against a live
  backend/device — same sandbox limitation as every prior entry in this
  log.
- **Next:** run the two `⚠️` items above against a real backend + Expo run
  once available (confirm the `read`/`createdAt` field names actually
  come back as expected, and check for the route-collision warning); then
  decide whether to wire `markAsRead`/`markAllAsRead` into the new screen.

### 2026-07-14 — Full import/dependency sweep after the migration
- **Context:** several bundler crashes had already been traced to the same
  root cause — files moved/restructured during the expo-router migration
  without their imports or locations being fixed (e.g. `profile.tsx` was
  manually relocated into `(tabs)/` and its relative imports corrected,
  `expo-secure-store` was manually added to `package.json`, both before
  this pass). Did a full systematic sweep to find anything left over.
- **Method:** grepped every `import`/`export ... from`/dynamic-`import(`
  statement in every file under `app/` and `src/` (~45 files), resolved
  each relative and `@/`-aliased path against the actual file tree (`@/*`
  → `./src/*` per `tsconfig.json`), and cross-checked every bare package
  specifier against `package.json`'s `dependencies`. Also spot-checked
  file-name casing (Windows' filesystem is case-insensitive but Metro's
  resolver isn't, so a case mismatch can work locally and still break a
  real build) — no mismatches found.
- **Result: no broken import paths and no missing package dependencies
  found under `app/` or `src/`.** Every relative import (`../`, `../../`,
  `../../../`) resolves to a real file, every `@/...` import resolves
  under `src/`, and every bare package (`expo-router`, `lucide-react-native`,
  `react-native-safe-area-context`, `@react-native-picker/picker`,
  `expo-document-picker`, `@miblanchard/react-native-slider`,
  `expo-secure-store`, `expo-auth-session`, `expo-web-browser`, `firebase`,
  etc.) is listed in `package.json`. The `profile.tsx`/`expo-secure-store`
  fixes appear to have been the last of this specific class of bug.
- **Found a different, more serious bug in the same family — not an
  import path, but a dead entry point:** `package.json` has
  `"main": "expo-router/entry"`, which means expo-router boots
  `app/_layout.tsx` directly and never loads the project-root `App.tsx` at
  all. But `App.tsx` was the file doing all the real setup — font loading
  (`useFonts`) and wrapping the tree in `ThemeProvider`, `SessionProvider`,
  and `JobsProvider`. `app/_layout.tsx` called `useTheme()` directly with
  no provider above it. Net effect: every `useTheme()`/`useSession()`/
  `useJobs()` call anywhere in the app was silently getting each context's
  *default* stub value instead of real state — jobs list permanently `[]`,
  session permanently signed-out, and worse, `SessionContext`'s default
  `login`/`register` literally `throw new Error('SessionProvider not
  mounted')`, so tapping login/register would crash. This is almost
  certainly the underlying cause behind at least some of the "bundler
  crash" reports, not just the two already-fixed import issues.
  - **Fixed:** moved the font-loading gate and
    `ThemeProvider`/`SessionProvider`/`JobsProvider` wrapping from
    `App.tsx` into `app/_layout.tsx` (the file actually mounted), split
    into an inner `RootStack` component so `useTheme()` runs *inside*
    `ThemeProvider` rather than above it. Verified with `npx tsc --noEmit`
    — no new errors introduced.
  - **Deleted `App.tsx`** (root-level) after flagging it as fully
    superseded/dead code and getting an explicit go-ahead — it was
    git-tracked and clean (no uncommitted work in it), and nothing else
    imported it.
- **Also deleted `Frontend/PrintForge-RN-Final/`** — a 6-file leftover
  fragment (`app/(app)/(tabs)/dashboard/index.tsx`, `app/(auth)/login.tsx`,
  `app/(auth)/register.tsx`, `src/SessionContext.tsx`, `src/api/auth.ts`,
  `src/api/types.ts`) with no `package.json`/`app.json`/metro config of
  its own, outside expo-router's actual `app/` root, not bundled/routed,
  not referenced from the real `app/`/`src/` tree. Also flagged and
  confirmed before deleting — it's what caused the earlier `npx tsc
  --noEmit` runs to show a batch of unrelated "Cannot find module" errors
  under a `PrintForge-RN-Final/...` prefix.
- **`node_modules` became available partway through this pass** (wasn't
  installed for any earlier entry in this log — every prior "verified with
  tsc" note upstream of this one was only checking for *new* errors
  against a baseline of "Cannot find module" noise, not a genuinely clean
  run). With real dependencies present, re-ran `npx tsc --noEmit` after
  all the changes above (the notifications feature, the `_layout.tsx`
  fix, and the two deletions): **zero errors, exit code 0** — the first
  fully clean typecheck this project has had in this log. Also grepped
  the whole tree (excluding `node_modules`) for any remaining reference
  to `App.tsx` or `PrintForge-RN-Final` — none found outside this file.
- **Not verified:** still haven't run this against a live Metro
  bundler/device/Expo Go — the `_layout.tsx` fix is reasoned from how
  `expo-router/entry` and React context defaults work and confirmed
  clean by the type system, not confirmed by an actual app boot.
- **Next:** run the app for real (Metro/Expo Go/simulator) to confirm the
  `_layout.tsx` fix actually resolves the crash symptoms you were seeing,
  and to catch anything a typecheck can't (runtime-only issues, native
  module linking, etc.). Otherwise this class of bug (moved files / stale
  imports / missing deps) is fully swept for `app/` and `src/`, and the
  project now typechecks clean end to end.

### 2026-07-14 — Batch 1: staff approve/reject, notification mark-as-read, marketplace wiring
- **Baseline note:** the user confirmed the app now runs end-to-end (Metro/
  Expo boot, real device or simulator) before this batch started. Every
  earlier entry in this log carried a "never verified live" caveat for
  auth/jobs/notifications — that caveat is now retired for that baseline.
  It still applies to everything new in *this* batch (see each item below).

- **1. Staff queue approve/reject (`app/staff/queue.tsx`)**
  - Wired the Approve/Reject buttons to the existing `approveJob`/
    `rejectJob` from `src/api/jobs.ts` (added last batch, never called
    until now). Both call `JobsContext`'s `refetch()` on success instead
    of mutating local state, per the task's explicit instruction.
  - **Reject reason:** reused the screen's existing "OPERATOR NOTES" text
    input rather than building a new modal — its placeholder ("Add setup,
    support, or pickup notes...") was already generic enough to double as
    a reject reason, and the task said to reuse existing UI if present.
  - Added per-action loading state (`actionLoading: 'approve' | 'reject' |
    null`) that disables both buttons and swaps their label to "Approving…
    "/"Rejecting…" while a call is in flight, plus an inline error `Text`
    on failure (matches the task's "simple Text below the buttons" spec).
  - Added a guard: once `selected.status !== 'SUBMITTED'`, both buttons
    disable and a note explains the job was already reviewed — prevents
    double-approving/rejecting after a refetch changes the status under
    the user.
  - **Removed the "Update job status" button** (previously a no-op
    `onPress={() => {}}`) — it had no corresponding backend endpoint
    (`jobs.ts` only has approve/reject, no generic status-update call) and
    leaving a permanently-fake button directly beside two newly-real ones
    seemed actively misleading rather than neutral. Flagging this as a
    small removal beyond the literal task text, made because leaving it
    would contradict the "no more mock/dead-end screens" goal of this
    whole migration.
  - **Verified:** `npx tsc --noEmit` clean. Not run against a live backend
    — needs a real SUBMITTED job and a lab-staff account to exercise for
    real.

- **2. Notifications mark-as-read**
  - Confirmed exact routes from `NotificationController.java`:
    `PATCH /api/notifications/{notificationId}/read` (returns the updated
    `Notification`) and `PATCH /api/notifications/read-all` (JWT-derived,
    same pattern as `GET /api/notifications` — the controller comment
    marks `/user/{userId}/read-all` as the backward-compatible variant).
    Added `markAsRead`/`markAllAsRead` to `src/api/notifications.ts`
    following `fetchNotifications`'s conventions exactly.
  - Wired into `app/(app)/(tabs)/notifications.tsx`: tapping an unread
    card calls `markAsRead` and updates that item's `read` flag plus
    `unreadCount` locally (no refetch — task said "updates local state"
    explicitly for this one, unlike the staff-queue instruction). Added a
    "Mark all as read" pill in the list header, shown only when
    `unreadCount > 0`, calling `markAllAsRead` and clearing all items'
    `read` flags + the count locally the same way.
  - Added a `pendingId` guard so a card can't be tapped twice while its
    own mark-as-read call is in flight, and a `markingAll` guard for the
    same reason on the header button. Inline errors surface via a small
    `actionError` Text under the header, separate from the existing
    whole-list `error` state (that one only renders inside the empty
    state, which wouldn't be visible once notifications have loaded).
  - Visual style untouched beyond what the new elements needed — no
    restyle of existing cards/header, per the task's instruction.
  - **Verified:** `npx tsc --noEmit` clean. Not run live — same unverified
    caveat as the `read`/`createdAt` field-name assumption already flagged
    in the previous entry.

- **3. Marketplace API + wiring (`src/api/marketplace.ts`, new)**
  - Read `MarketplaceController.java` and `DesignListing.java` directly
    (same approach as the notifications work) rather than guessing from
    `mockData.ts`'s `LISTINGS`. Two real findings from that:
    1. **`GET /api/marketplace/my-earnings` does not exist.** Handoff.md's
       own Phase 2 table listed it, but the real controller has no such
       route. Did not implement it — inventing a URL that 404s would be
       worse than omitting it. `DesignListing` already carries
       `totalOrders`/`totalEarnings` per listing, so a future earnings
       screen can sum `fetchMyListings()` results client-side instead.
       Implemented `fetchListings`, `fetchListing`, `fetchMyListings`,
       `createListing`, `deleteListing` — the rest of the table's list.
    2. **No DTO layer, same as notifications** — `MarketplaceController`
       returns the `DesignListing` entity directly, so the wire shape is
       plain camelCase (`basePrice`, `thumbnailUrl`, `totalOrders`, etc.),
       not snake_case like `jobs.ts`'s DTO-backed `PrintJobResponse`.
  - **The mock `Listing` shape doesn't match reality at all** — it has
    `material`, `rating`, and a `designer` display name; `DesignListing`
    has none of those (rating would need a review system, designer name
    would need a `User` join by `designerId`, material isn't tracked per
    listing anywhere in this schema). Rather than force-fit the old shape,
    defined a new `MarketplaceListing` type in `marketplace.ts` — named
    that way, not `Listing`, specifically to avoid colliding with the
    still-in-use mock `Listing` type (see next point).
  - **`src/data/mockData.ts`'s `LISTINGS`/`Listing` were *not* removed** —
    unlike `JOBS` and `NOTIFICATIONS` in earlier passes, `LISTINGS` is
    still imported by `app/(app)/(tabs)/dashboard/designer.tsx`, which is
    out of this batch's explicit scope. Confirmed via grep before leaving
    it alone. That screen still shows fabricated mock rating/material data
    for a designer's own listings — a real gap, but wiring it is a
    follow-up for whichever future batch covers the designer dashboard.
  - **`GET /api/marketplace/{id}` returns more than a listing** — the
    backend wraps it as `{ listing, quote, quote_error? }`, auto-generating
    a real price quote via `EstimateService`. `fetchListing()` only
    unwraps `.listing`; the `quote` isn't surfaced in the UI yet, so
    `marketplace/[id].tsx` still computes its own client-side estimate
    (`price × qty`) exactly like it did against mock data. Flagged as a
    reasonable follow-up, not built now — wiring the real quote would
    change the pricing UX, which felt like scope beyond "swap the data
    source."
  - **Rewired `src/components/ListingCard.tsx`, `marketplace/index.tsx`,
    `marketplace/[id].tsx`** to `MarketplaceListing`:
    - Dropped the material filter chips on the marketplace list screen
      entirely (no field to filter by) and the material/rating badges on
      `ListingCard` and the listing detail hero — replaced "downloads"/
      rating display with the real `totalOrders` field.
    - Added loading/error states to both screens (list screen: full-screen
      loading/error/retry, matching `notifications.tsx`'s pattern; detail
      screen: same pattern plus a not-found branch).
    - **Fixed the same unsafe-fallback bug class as `jobs/[id].tsx` last
      batch:** `marketplace/[id].tsx` used
      `LISTINGS.find(...) ?? LISTINGS[0]` — harmless against non-empty
      mock data, wrong once a fetch can legitimately 404 or still be
      loading. Replaced with a proper loading/error/not-found guard.
  - **`marketplace/create.tsx` — genuine blocker found, not resolved,
    clearly surfaced instead of faked:** `POST /api/marketplace` requires
    a numeric `file_id` (`@RequestParam Long fileId`) referencing a model
    already uploaded via `POST /api/files/upload`. File upload is
    explicitly out of scope for this batch (Files is its own later batch).
    `modelFile` on this screen is only ever a local `DocumentPicker`
    result — it has no backend id. `createListing()` in `marketplace.ts`
    is fully implemented and ready to call the moment file upload exists,
    but `create.tsx` doesn't call it: submitting a ready form now shows an
    honest inline banner explaining the gap instead of sending a
    fabricated `file_id` (which would either get rejected by Spring's
    required-param binding before any real validation ran, or worse,
    silently attach the wrong file to a real listing). This mirrors how
    `approveJob`/`rejectJob` sat unused in `jobs.ts` for a batch before
    being wired — building the API layer ahead of its prerequisite is
    consistent with that precedent, not a new pattern.
  - **Verified:** `npx tsc --noEmit` clean across every touched/new file.
    Not run against a live backend — same caveat as everything else in
    this log; the `GET /api/marketplace` public-storefront endpoint in
    particular hasn't been confirmed to actually require a JWT (passed
    `token` anyway for consistency with the rest of this app's screens,
    since every screen here is session-gated regardless).

- **Overall Handoff.md scope check:** payments, admin, files, printers,
  error boundaries, and JWT expiry handling were left untouched, as
  instructed.
- **Next:** run all three pieces above against a live backend/device to
  confirm the route names, field names, and multipart contract for
  `createListing` are exactly right (none of this was runtime-tested,
  only typechecked and read directly from backend source). Once file
  upload exists, `create.tsx` needs a small follow-up to actually call
  `createListing` instead of showing the blocker banner. Marketplace's
  "my earnings" gap and `dashboard/designer.tsx`'s still-mock data are
  known follow-ups for later batches, not bugs in this one.

### 2026-07-14 — Full rebrand: brand colors, Barlow Condensed, dark-mode default
- **Scope:** rebuilt the theme system to match the brand identity doc
  (Warm Orange #FF5803, Off Black #222222, Off White #E5E5E5, Navy
  #16182B) and swapped all typography from Outfit/JetBrains Mono to
  Barlow Condensed, then applied both across every screen.

- **Fonts:** installed `@expo-google-fonts/barlow-condensed`, confirmed
  its exact exports by reading the installed package's `index.js` before
  using any of them (`BarlowCondensed_400Regular`, `_500Medium`,
  `_700Bold`, plus `_700Bold_Italic` — see next bullet). Removed
  `@expo-google-fonts/jetbrains-mono` and `@expo-google-fonts/outfit` from
  `package.json` via `npm uninstall` (not just hand-editing — keeps
  `package-lock.json` in sync) — but only after grepping the whole
  `app/`/`src/` tree for lingering references first. Found one:
  `app/admin/index.tsx` had a hardcoded `fontFamily: 'JetBrainsMono_400Regular'`
  literal (not routed through `designTokens.type.mono`) plus four
  hardcoded `#94A3B8` colors and raw `fontWeight: '700'` instead of the
  theme's heading font — that whole file predated the theme system
  (comment literally said "✅ Only static/layout values here — no
  colors"). Rewrote it to a proper `makeStyles(colors)` pattern before
  removing the package, so nothing broke.
- **Deliberate deviation — loaded a 4th font weight not in the brief's
  closed list:** `BarlowCondensed_700Bold_Italic`, for the splash
  screen's italicized "IDEAS". `fontStyle: 'italic'` applied to a custom
  loaded font frequently fails to render as italic on Android (the
  renderer needs the actual italic font file, not a synthetic slant), so
  using the package's real italic file was the only reliable
  cross-platform way to satisfy the brief's own "italic style"
  requirement for that one word. Flagged in a code comment in
  `app/_layout.tsx` (where it's loaded) and here.
- **`designTokens.type.mono` gap:** Barlow Condensed has no monospace
  variant, and the brief wants JetBrains Mono gone. Repointed
  `type.mono` to `BarlowCondensed_500Medium` rather than keeping a second
  font family loaded just for `MonoText.tsx` (job IDs, tracking numbers,
  admin user/printer IDs). This is a visible, accepted regression — those
  fields lose their distinct "code-like" monospace look and now render in
  the same font as everything else. Not raised as a question because the
  brief was explicit that JetBrains Mono should go; flagging here so it's
  a known tradeoff, not a missed detail.

- **`src/theme.ts` — full rebuild.** Both dark and light color sets now
  use only the exact hex/rgba values given in the brief for every field
  it specified (background, card, cardElevated, primary, primarySoft,
  foreground, mutedFg, border, sidebar, sidebarBorder, and the three
  status buckets). Two structural decisions the brief didn't cover:
  - **Status colors — the brief gives 3 buckets (approved/pending/failed),
    but `StatusBadge.tsx` needs one per `JobStatus`, which has 8 values.**
    Mapped as a traffic-light simplification: `APPROVED`/`COMPLETED` →
    approved (green); `SUBMITTED`/`QUEUED`/`PRINTING`/`IN_PROGRESS` →
    pending (orange); `FAILED`/`REJECTED` → failed (red). Kept all 8 of
    the existing theme keys (`statusSubmitted`, `statusQueued`, etc.)
    rather than renaming everything to 3 keys and rewriting every call
    site across `StatusBadge.tsx`, `jobs/[id].tsx`, `staff/queue.tsx`,
    both dashboards, `marketplace/[id].tsx`, `notifications.tsx`, and
    `create.tsx` (~10 files, ~40 call sites) — much lower risk, same
    visual result, since every one of those 8 keys now resolves to one of
    the 3 exact brand-specified color values. Also, the brief's status
    color spec has no `dot` sub-color (used for small status-indicator
    circles everywhere) — reused each bucket's `text` color for `dot`
    rather than inventing an unlisted color.
  - **Supplementary tokens the brief doesn't mention** (`destructive`,
    `success`, `warning`, `info`, printer-status colors, material-chip
    colors, chart colors) were left untouched — not hardcoded literals in
    component files, already proper theme tokens, and out of the brief's
    stated scope ("don't touch colors inside status badge logic that are
    intentionally semantic").
  - **`onPrimary` and `white`** (used for text/icons on top of primary or
    dark surfaces — checkmarks on badges, avatar initials, Switch thumb
    colors) were repointed from `#FFFFFF` to the brand's Off White
    (`#E5E5E5`), so nothing on screen renders an unlisted pure white.
    `inputBg` was set equal to `card` in both themes, since the brief's
    login mockup calls for input fields on `colors.card` — this makes
    every text input in the app (not just login) pick up that treatment.
  - Removed the unused `coolGray`/`lightGray` convenience aliases
    (grepped first — confirmed zero call sites).

- **`src/ThemeContext.tsx`:** dark is now the default and initial state
  (`useState<Theme>('dark')`), with a comment noting there was never a
  `useColorScheme()` read to begin with, so there was nothing to
  override — the "override system preference detection" instruction was
  already satisfied by the existing code.

- **`app/index.tsx` (splash screen) — full rebuild, three flagged
  assumptions:**
  1. `assets/icon.png` and `assets/splash.png` are **placeholder text
     files**, not real images (confirmed by reading their raw bytes —
     literally "PLACEHOLDER ICON / this file is a placeholder..."). Used
     the existing in-app "logo mark" pattern instead (a `Box` icon from
     `lucide-react-native` in a rounded navy square — the same pattern
     `login.tsx` and the old onboarding screen already used as their
     "logo"), per the brief's own fallback clause ("use the existing icon
     ... or the app's existing logo component if one exists").
  2. **The brief's premise that this screen "already has auth-redirect
     logic" was wrong** — `app/index.tsx` was a static "Get started"
     onboarding screen (hero illustration, feature cards, CTA button) with
     no session check at all. The only real redirect-by-role logic in the
     app lives in `dashboard/index.tsx`, which runs *after* login, not at
     the root. Since the splash's own requested design (loading dots,
     "Please wait...") only makes sense for a transient, auto-redirecting
     screen, built the missing piece: reads `token`/`authLoading` from
     `useSession()`, shows the styled splash while `authLoading`, then
     `<Redirect>`s to `/(app)/(tabs)` or `/(auth)/login` once resolved.
     This fully replaces the old onboarding content — if a separate
     marketing/onboarding flow is still wanted, it needs its own new
     route now.
  3. **Two literal contrast bugs in the spec, fixed without changing the
     specified letter colors:** "REALITY" is specified as Warm Orange
     text, and the screen's background is solid Warm Orange — as
     literally specified, that word would be 100% invisible. Kept the
     exact `#FF5803` letter color and added a small navy `textShadow`
     purely for legibility (not a stylistic choice — zero contrast is a
     bug, not a look). Same issue with the single "orange" accent dot
     among the 5 loading dots — given a thin off-white ring so it's
     visible against the identical-color background.
  - **Verified:** typechecks clean. **Not verified:** actual font
    rendering of the italic weight, the navy-shadow/ring contrast fixes
    in practice, and splash timing (see "what to check on device" below).

- **`app/(auth)/login.tsx`:** re-centered the logo+wordmark block (was a
  left-aligned row; brief wants it centered at top) and split "PrintForge
  3D" into "PRINT" (Off White) + "FORGE 3D" (Warm Orange) via nested
  `Text` components, matching the brief's exact wordmark treatment.
  Updated the footer copy to the brief's exact wording ("Don't have an
  account? Sign Up") and changed its non-action text from `mutedFg` to
  `foreground` (brighter Off White) to match "Off White/Orange" instead
  of a dimmed tone. Everything else the brief asked for — card-background
  inputs, off-white input text, `radius.md` corners, full-width orange
  primary button, OR-divider + Google button — **already matched**
  once the theme values themselves were correct, since this screen was
  already built entirely from `colors.X`/`designTokens.X` tokens with no
  hardcoded values. Checked explicitly for blue (`colors.info`, any blue
  hex): none found on this screen already, so "no blue" needed no changes.

- **Floating blue gear/settings FAB (`app/_layout.tsx`):** searched the
  entire `app/` and `src/` tree for a "Settings"/gear icon, blue
  background colors, and absolutely-positioned circular buttons. **Found
  nothing** — no FAB exists anywhere in this codebase, in `_layout.tsx` or
  otherwise (the one `Settings`-adjacent hit, `profile.tsx`'s
  `SettingsRow`, is an ordinary in-page account-details row, not a
  floating button). Also checked git log for `app/_layout.tsx`/`App.tsx`
  — only 3 commits total in this repo's history, nothing showing a FAB
  being added or removed. Concluded the brief's premise doesn't match
  this codebase and made no change here, rather than removing something
  that isn't there.

- **`src/components/Card.tsx`:** shadow is now light-mode-only
  (`shadowColor: colors.navy, offset {0,2}, opacity 0.08, radius 8,
  elevation 2`, exactly as specified); dark mode drops the shadow
  entirely (`elevation: 0`) and relies on the existing border, per "in
  dark mode, use the border from the theme instead." Needed `isDark` from
  `useTheme()`, so `makeStyles` picked up a second parameter.

- **Tab bar (`src/components/SwipeTabBar.tsx`):** active/inactive tab
  colors (`colors.primary`/`colors.mutedFg`) were already correct.
  Background was `colors.sidebar` and top border was `colors.sidebarBorder`
  — in dark mode `sidebar` equals `background` (Navy), not `card` (Off
  Black), so the tab bar was blending into the screen background instead
  of standing off it as its own surface. Changed both to `colors.card`/
  `colors.border` per the brief's explicit spec.

- **Stat cards — 3px left `colors.primary` border accent, `colors.card`
  background.** Applied to the three screens the brief names ("dashboard
  and orders"): `dashboard/student.tsx`, `dashboard/designer.tsx`, and
  `app/jobs/index.tsx` (which *is* the orders screen —
  `(tabs)/orders.tsx` just re-exports it). Deliberately **not** applied to
  `admin/index.tsx` or `profile.tsx`'s stat rows, which have the same
  visual pattern but aren't named in the brief's "dashboard and orders"
  scope — left alone to avoid guessing scope wasn't intended.

- **Dashboard quick actions → 2×2 grid
  (`dashboard/student.tsx`):** was a vertical list of horizontal rows
  (icon + text + chevron, list-item styling). Rebuilt as a `flexWrap`
  grid of vertical cards (icon-on-top in a `primarySoft` square, bold
  title, muted subtitle below), dropped the trailing chevron since it
  read as list/settings-menu navigation rather than the "modern &
  digital" tile feel the brief asked for. `dashboard/designer.tsx` has no
  equivalent quick-actions list, so nothing to change there.

- **Global hardcoded-color sweep (`app/` + `src/components/`):** grepped
  for hex literals and `'white'`/`'black'` strings across both trees.
  `src/components/` was already fully clean. Fixed in `app/`:
  - `#7F56D9` (purple icon color, no matching token) → `colors.chart4`
    (already `#7F56D9` in the theme) — 4 call sites across
    `jobs/[id].tsx` and `profile.tsx`.
  - `#D9A11A` (hardcoded star-rating gold, `dashboard/designer.tsx`) →
    `colors.warning`.
  - `#A8B0C0` (stale pre-rebrand muted color) → `colors.mutedFg`, and
    `#FFFFFF` → `colors.white`/`colors.offWhite`, in `profile.tsx`'s
    `spendCard` and `create.tsx`'s `heroCard` — both of these cards use a
    **fixed** `colors.navy` background regardless of theme, so their text
    needed fixed off-white-based tones rather than `colors.mutedFg`/
    `colors.foreground`, which flip to dark-navy-on-navy (near-invisible)
    in light mode. Flagged with a comment at each site so a future editor
    doesn't "simplify" them back to theme-reactive colors and break light
    mode.
  - **Deliberately left alone:** `submit.tsx`'s `printColors` array
    (Navy/White/Orange/Blue/Green/Red swatches for choosing an actual
    print color) — real product data, not UI chrome, same category as
    the status-badge colors the brief said not to touch.
  - **`app.json`:** the native splash screen's `backgroundColor` (shown by
    the OS before any JS/React renders) was a stale `#0A0F1E`, unrelated
    to any of the new brand colors — would have flashed dark before the
    new orange in-app splash screen appears. Not named in the brief, but
    directly caused by the splash redesign, so changed it to `#FF5803` to
    match and made the native→JS splash handoff seamless. Same file's
    Android adaptive-icon background was left alone (icon.png being a
    placeholder means the icon itself can't be fixed here regardless).

- **Verified:** `npx tsc --noEmit` — **zero errors**, clean run across
  the whole project after every change above.
- **Not verified (what to check on device):**
  1. **Font rendering** — confirm Barlow Condensed actually loads and
     renders (headings, body, medium weight) rather than falling back to
     a system font, and specifically confirm `BarlowCondensed_700Bold_Italic`
     renders as real italic on both iOS and Android.
  2. **Splash timing** — confirm the native splash (`app.json`, now
     orange) hands off cleanly to the new `app/index.tsx` splash, and that
     the `authLoading` → `<Redirect>` transition doesn't flash or stutter
     on a real device with real network latency (unlike this sandbox, a
     real backend call takes real time).
  3. **The two contrast fixes** ("REALITY" on orange, the orange accent
     dot) — read fine in theory, need an actual screen to confirm the
     navy-shadow/off-white-ring treatments look intentional rather than
     muddy.
  4. **`assets/icon.png`/`splash.png`** are still placeholder text files —
     unrelated to this rebrand pass, but worth fixing before any real
     build/store submission, since right now the app has no real icon.
- **Next:** device check per the four points above. If the mono-font
  regression on job IDs/tracking numbers/admin IDs is unwanted, decide
  whether to reload a real monospace font (e.g. keep JetBrains Mono
  loaded alongside Barlow Condensed just for `MonoText.tsx`) or accept it
  as-is.

### 2026-07-14 — Batch 2: Files API, marketplace create finished, Admin API, Phase 3 (error boundary, JWT expiry, toast)
- **Baseline note:** confirmed per this batch's prompt — Batch 1 verified
  working end-to-end on a real device, app boot-verified with the new dark
  theme. Didn't touch `theme.ts`/`ThemeContext`/visual styling except where
  a new component genuinely needed a token that already exists (no new
  tokens were needed — everything below uses existing `colors.X`/
  `designTokens.X`).

- **1. `src/api/files.ts` (new).** Read `FileController.java`/
  `FileService.java`/`ModelFile.java` directly rather than guessing.
  Confirmed: no DTO layer (same as notifications/marketplace — plain
  entity JSON, camelCase), and **no server-side file-type restriction at
  all** (`FileService.saveFileMetadata` stores `file.getContentType()` as-
  is, defaulting to `application/octet-stream` if absent) — so
  `create.tsx`'s existing `DocumentPicker` call (`type: '*/*'`) was
  already correct and needed no narrowing.
  - `uploadFile(token, asset)` → `POST /api/files/upload`, real
    multipart/form-data via `apiFetch`'s existing `isFormData` option —
    **no changes needed to `client.ts`** for this; it already supported
    FormData bodies from the marketplace batch's `createListing`. The
    task offered a choice here (extend `apiFetch` vs. a separate
    `uploadFetch` helper) — went with "already supported, do nothing"
    since that option existed and neither of the offered options was
    actually necessary.
  - `fetchFile`/`fetchFiles` → `GET /api/files/{id}` / `GET /api/files`.
  - `getDownloadUrl(id)` — `GET /api/files/{id}/download` streams raw
    bytes (a Spring `Resource`), not JSON, so it can't go through
    `apiFetch` (which always parses the body as JSON). Only builds the
    URL for a caller to open directly (`Linking.openURL`, etc.) — not
    called from anywhere yet, since nothing in this batch needs to
    download a file back.

- **2. `marketplace/create.tsx` — finished the real flow, replacing
  Batch 1's blocker banner.** `handleSubmit` now: uploads the picked
  model via `uploadFile`, shows "Uploading..." on the submit button
  during that, then calls `createListing` with the returned numeric file
  id, showing "Creating listing..." meanwhile. On success, navigates back
  (see routing note below). On failure, logs to console and sets the
  existing inline `submitError` banner — distinguishing in the log
  message whether the file upload itself failed vs. upload succeeded but
  `createListing` failed (the latter logs the orphaned file's id;
  cleanup is explicitly out of scope per the task, since there's no
  `DELETE /api/files/{id}` endpoint to call anyway). Both Cancel and
  Create buttons disable during either phase so the user can't navigate
  away or double-submit mid-upload.
  - **Routing note, not a bug but a real constraint:** this app's tabs
    (dashboard/marketplace/submit/orders/profile) aren't separate
    expo-router routes — they're pages inside one `SwipePager` with local
    `activeIndex` state (`(tabs)/_layout.tsx` renders the same pager
    regardless of which sub-route URL is matched, confirmed back in the
    import-sweep batch). `create.tsx` is a stack screen reached only from
    `dashboard/designer.tsx`'s "create listing" button — there is no
    direct route to "the marketplace tab specifically" from here. Used
    `router.back()`, which returns to the designer dashboard (where the
    user came from), not literally the marketplace list as the task
    described. Making it land on the marketplace tab specifically would
    need cross-stack tab-switch signaling through `SwipeTabsContext`,
    which isn't wired for that today — noted as a follow-up, not treated
    as blocking.
  - **Verified:** typechecks clean. **Not verified:** the actual upload
    against a live backend (multipart body shape, Cloudinary round-trip
    timing) — written directly against `FileService`/`MarketplaceController`
    source, needs a real device run with a real file.

- **3. `src/api/admin.ts` (new) + `app/admin/index.tsx` wired.** Read
  `AdminController.java`/`AdminService.java` directly. Real findings:
  - **No DTO at all** for `GET /api/admin/dashboard` — `AdminService`
    builds a `LinkedHashMap` by hand, and its keys are an inconsistent mix
    of camelCase (`totalJobs`, `jobsByStatus`) and snake_case
    (`designer_earnings`, plus nested `designer_name`/`total_owed`) — not
    a transcription error, that inconsistency is genuinely on the
    backend. Typed exactly as observed, then adapted to a consistent
    camelCase shape (`AdminDashboard`) for the frontend.
  - **The "Users" tab had no backing endpoint at all** — the backend only
    has `POST /api/admin/users` (create), no user-listing GET anywhere.
    The old fake-random-user-list is gone; replaced with an honest
    message stating the gap, same treatment as the "my-earnings doesn't
    exist" finding from the marketplace batch. `createUser()` is still
    fully implemented in `admin.ts` (ADMIN-only, matches the controller's
    narrower per-method `@PreAuthorize`) but unwired — no screen has a
    create-user form, and building one wasn't asked for; same "API layer
    ahead of UI" precedent as `approveJob`/`rejectJob`.
  - **"Printers" tab** replaced `PRINTERS` mock data with the dashboard's
    real `printersByStatus` aggregate counts (a simple status→count list)
    — full per-printer CRUD/listing is explicitly out of scope this batch
    ("printers... deliberately out of scope"), but the aggregate counts
    come along for free with the dashboard endpoint, so used them rather
    than leaving the tab on mock data unnecessarily.
  - **"Earnings" tab** now shows the real `designer_earnings` list
    (designer name + amount owed), replacing the placeholder text.
    **"Logs" tab** left as the existing placeholder — no backend endpoint
    for this at all, nothing to wire.
  - Top stat row replaced the four fully-fabricated numbers ("Total
    Users: 128", "Monthly Revenue: GH₵ 35,400", etc. — no backing data
    for any of them) with four that map directly to real dashboard
    fields: Total Jobs, Total Printers, Awaiting Review (`jobsByStatus`
    SUBMITTED count), Owed to Designers (summed `designer_earnings`).
    Added the same 3px left `colors.primary` border accent used on the
    dashboard/orders stat cards from the rebrand batch, for visual
    consistency (not explicitly asked for admin here, but matches "sensible
    display cards matching the existing visual style").
  - **`mockData.ts`'s `PRINTERS`:** grepped before touching anything —
    still imported by `marketplace/index.tsx` ("Top campus labs") and
    extensively by `staff/queue.tsx` (printer fleet management), both
    explicitly out of scope this batch. **Not orphaned, not deleted.**
  - **Verified:** typechecks clean. **Not verified:** against a live
    backend/admin account — needs a real LAB_STAFF/ADMIN login to
    exercise `GET /api/admin/dashboard`'s `@PreAuthorize`.

- **4. Phase 3 cleanup:**
  - **Global error boundary** (`src/components/ErrorBoundary.tsx`, new):
    a class component (required — no hook equivalent exists for
    `getDerivedStateFromError`/`componentDidCatch`) wrapped by a small
    functional component that reads `usePathname()` from expo-router and
    passes `() => router.replace(pathname)` down as the retry callback.
    Styled with the static `colors`/`designTokens` export from `theme.ts`
    rather than `useTheme()`, since a class component can't call hooks —
    fine here since Navy/Warm Orange are brand constants, not
    theme-reactive. Mounted as the outermost wrapper in `app/_layout.tsx`
    (outside `ThemeProvider`), so it can catch a render error from any
    provider below it, including Theme/Toast/Session/Jobs themselves.
  - **JWT expiry (`src/api/client.ts`):** on a 401 response, clears the
    stored token (`authStorage.clearStoredToken`) and
    `router.replace('/(auth)/login')`, per the task. **Important
    correctness detail not in the literal instructions:** gated this on
    `token` having been present on the *specific request* that got the
    401, not on every 401 unconditionally. `/api/auth/login` and
    `/api/auth/register` are unauthenticated endpoints that also return
    401 for wrong credentials (not "expired session") — `auth.ts`'s
    `login()`/`register()` never attach a token to those calls, so this
    condition correctly never fires for them. Without this gate, a wrong-
    password attempt on the login screen would force-navigate to
    `/(auth)/login` (the same screen) mid-render, likely clearing the
    typed email/password and the inline error before the user ever saw
    it — a real regression, not a hypothetical. **Known gap, flagged, not
    fixed:** this only clears the *persisted* token
    (`expo-secure-store`) — `SessionContext`'s in-memory `token`/
    `appUser` state isn't cleared by this path, since `client.ts` can't
    import `SessionContext` without a circular dependency
    (`SessionContext` → `auth.ts` → `client.ts`). In practice this is
    self-correcting (the user is redirected to login immediately, and
    any further call with the stale in-memory token would just 401 and
    redirect again), but it's not a complete fix — flagged rather than
    silently accepted.
  - **Toast (`src/ToastContext.tsx`, new):** `useState`-based overlay, no
    new dependency. Also exports `emitToast()`, a tiny imperative
    subscriber-bridge so `client.ts` (a plain function, not a component)
    can trigger a toast without needing React context — `ToastProvider`
    is the only subscriber. Wired into exactly two places, both chosen
    because they had no inline home already, not applied broadly:
    1. `client.ts`'s network-unreachable catch (`ApiError` status 0) —
       the literal "network unavailable" case named in the task,
       triggered at the one universal choke point for every API call.
    2. `JobsContext.tsx`'s background `load()` failure — checked all 5
       screens that call `useJobs()` first; **none of them destructure
       `error`** from the context, so a failed background jobs fetch
       previously showed an empty list with zero explanation anywhere.
       Genuinely the "no better UI home" case the task described, not a
       guess.
    - The 401-redirect path (above) also emits a toast
      ("Your session expired — please sign in again.") since a forced
      logout from a background request is, by definition, another
      "no inline home" situation.
    - **Deliberately left alone:** every other existing `ApiError` catch
      block already shows `err.message` inline (login, register,
      staff/queue approve/reject, notifications mark-as-read, marketplace
      fetches, create.tsx) — not duplicated with a toast, per "inline
      error text on forms/screens stays."
  - **Confirmed out of scope, untouched:** `authProvider` on the profile
    screen, payments, printers/materials/estimates.
  - **Verified:** `npx tsc --noEmit` — zero errors across every change in
    this batch. **Not verified:** the error boundary has never actually
    caught a real render error on device (only reasoned about
    structurally); the toast's visual placement/timing hasn't been seen
    on a real screen.

- **No genuinely ambiguous/blocking cases this batch** requiring a
  decision back from the user — the two real gaps found (no
  `GET /api/admin/users` listing endpoint, the `create.tsx` routing
  limitation) both had a clear, defensible resolution documented above
  rather than needing a judgment call between comparable options.

- **Next:** device-test the two new flows end-to-end (file upload →
  listing creation; admin dashboard as a real LAB_STAFF/ADMIN account),
  confirm the 401 → login redirect actually fires correctly against a
  real expired/invalid token, and decide whether `create.tsx`'s
  post-create destination is worth wiring through `SwipeTabsContext` to
  land on the marketplace tab specifically. Remaining known gaps across
  the whole project: `assets/icon.png`/`splash.png` placeholders, the
  mono-font regression, `GET /api/marketplace/my-earnings` not existing,
  and `dashboard/designer.tsx` still on mock listing data.

### 2026-07-14 — Paystack payment integration: the backend reading changed where this got wired
- **Read `PaymentController.java`/`PaymentService.java`/`Payment.java`/
  `InitiatePaymentRequest.java` first, as instructed, before writing any
  code — and it revealed the task's premised workflow doesn't exist on
  this backend.** This is the single most important finding in this
  entry; everything else follows from it.
  - **`POST /api/payments/initiate` does not take a `jobId`.** Its body is
    `{ estimateId, listingId? }` (`InitiatePaymentRequest.java` — no
    `@JsonProperty`, so plain camelCase, not snake_case like
    `RegisterRequest`). There is no field, endpoint, or code path
    anywhere in `paymentservice/` that references an existing `PrintJob`
    id at all.
  - **Paying doesn't act on an existing job — it creates one.**
    `PaymentService.handleWebhook()` (triggered by Paystack's webhook,
    server-side, signature-verified with HMAC-SHA512 and then
    re-verified against Paystack's own `/transaction/verify` API — never
    trusting the webhook body alone) is what constructs a brand new
    `PrintJob` (status `SUBMITTED`) once payment clears, then links
    `payment.printJobId` back. Before payment, no `PrintJob` exists at
    all for that order.
  - **Concretely, this means:** there is no way to build "tap Pay Now on
    an APPROVED job card" as asked, because (a) the endpoint has no
    parameter to identify which job you're paying for, and (b) an
    APPROVED job (from the pre-existing submit → staff-approve
    `queueservice`/facade flow) was never created *by* a payment and has
    no linked `estimateId` exposed anywhere on the frontend to pay
    against (`PrintJob.estimateId` exists on the backend entity — the
    webhook sets it — but `src/api/jobs.ts`'s `PrintJobApiResponse`
    facade DTO never surfaces it). The submit-and-approve flow and the
    quote-and-pay flow are two currently-disconnected systems on this
    backend, not sequential stages of one flow.
  - **What I did instead of building a non-functional button:** wired the
    real payment trigger into `app/(app)/marketplace/[id].tsx`, the one
    screen that already has a genuine `estimateId` to pay against — its
    `GET /api/marketplace/{id}` call returns `{ listing, quote }`, where
    `quote` is a real, saved `Estimate` row with its own `id`. This also
    matches the backend's own `PAYMENT_SERVICE_HANDOFF.md`, which
    describes exactly this sequence as the intended flow ("browse
    marketplace → view listing (quote generated) → initiate payment").
    On `app/jobs/index.tsx` specifically (the literal target named in the
    task), added a "PAID" pill on job cards instead, cross-referencing
    `GET /api/payments/my-payments` against the jobs list by
    `payment.printJobId === job.id` — real data, no backend changes,
    honestly reflects what happened rather than offering a non-functional
    button. Both changes are documented with an in-file comment at the
    top of `jobs/index.tsx` explaining why, so a future reader doesn't
    wonder where the button went.
  - **Did not modify the backend** to add a job-linking field or a jobId
    parameter — that would be a real, non-trivial backend design change
    (deciding how "pay for an approved job" should even work: recompute
    an estimate from the job's stored parameters? require staff to
    generate one at approval time?) that wasn't asked for and deserves a
    real decision, not one made unilaterally while "just" adding frontend
    payment UI. Flagging this as the one thing in this batch that might
    warrant a conversation, even though nothing here was blocking.

- **`src/api/payments.ts` (new).** `PaymentApiResponse`/`Payment` types
  (no DTO layer on the backend, same as notifications/marketplace/files —
  plain entity JSON, Jackson default camelCase), `initiatePayment`,
  `fetchPayment`, `fetchMyPayments`, `retryPayment` (built per the task's
  spec; not called from anywhere yet — no screen has a "retry a failed
  payment" UI, same "API layer ahead of UI" precedent as `approveJob`/
  `createUser`).

- **`src/api/marketplace.ts` — extended `fetchListing`'s return shape**
  from `MarketplaceListing` to `{ listing, quote }`. The `quote` half was
  previously fetched-and-discarded (flagged as a "reasonable follow-up"
  in the marketplace batch's log entry) — now surfaced as a new `Quote`
  type (`estimateId` + `totalCost`) since the payment flow genuinely needs
  it. Updated `marketplace/[id].tsx`, the only caller, to match.
  - **Found and fixed a pricing-honesty problem while wiring this:**
    `marketplace/[id].tsx`'s displayed total was `listing.price × qty`
    (a client-side guess), but the amount Paystack actually charges is
    `quote.totalCost` — a fixed number from `GET /api/marketplace/{id}`,
    which the backend generates with **hardcoded parameters** (Standard
    quality, 20% infill, qty 1, PLA — see
    `MarketplaceController.getListing()`), regardless of what the user
    picks in the screen's "Configure your print" section. That section's
    material/quality/infill/qty selectors have never affected pricing —
    a pre-existing gap, not introduced here — but leaving the displayed
    total as a fabricated number would mean showing the user one price
    and charging them a different one, once this is wired to real money.
    Changed the total display to `quote.totalCost` directly and reworded
    the price card's caption to say so honestly, without overhauling the
    configure-your-print UX itself (out of scope for a payments task).

- **`src/components/PaystackWebView.tsx` (new).** Checked what was
  already available before adding anything, per the task: no
  `react-native-webview` in `package.json`; `expo-web-browser` already
  is (used elsewhere for the Google OAuth flow). Used
  `WebBrowser.openAuthSessionAsync()` — the officially-recommended API
  for exactly this "open a hosted page, detect the redirect back to the
  app" pattern (same category as OAuth) — instead of a raw embeddable
  `<WebView>`. This is a controller component with no visual JSX of its
  own (`openAuthSessionAsync` already presents its own native full-screen
  browser sheet); mount it conditionally to trigger a checkout.
  - **The redirect-detection design, and why it deviates from "poll
    once":** `PaymentService.callPaystackInitialize()` does **not** send
    a `callback_url` to Paystack at all — whatever URL Paystack redirects
    to afterward is purely a Paystack *account dashboard* setting,
    invisible to this codebase (checked `application.properties` too —
    only `paystack.secret-key`, nothing else Paystack-related). So the
    `redirectUrl` passed to `openAuthSessionAsync` (`printforge://payment-callback`,
    guessed from `app.json`'s `"scheme": "printforge"`) may or may not
    ever actually match. Rather than trust `openAuthSessionAsync`'s own
    result type (`success`/`cancel`/`dismiss`) as the source of truth,
    the component **always re-checks `GET /api/payments/{id}`** once the
    browser session closes, for any reason — the webhook (already
    verified against Paystack's own API) is the real source of truth.
    Since the webhook fires asynchronously and isn't guaranteed to have
    landed the instant the browser closes, this polls with a short
    bounded retry (5 attempts, 1.5s apart) instead of the task's
    suggested single check — a single check would very plausibly race
    the webhook and report "still pending" even on a genuinely successful
    payment. If retries are exhausted still `PENDING`, this deliberately
    does **not** call it a cancellation (a charge could still be in
    flight) — it routes to `onError` with a message telling the user to
    check My Payments before retrying, specifically to avoid a double
    charge from someone retrying after being told nothing happened.
  - **This entire area is exactly what the task flagged as needing a
    live Paystack test to confirm**, more than anything else in this
    batch — none of it can be verified without an actual transaction
    (see below).

- **`app/(app)/marketplace/[id].tsx`** — wired `handlePay` →
  `initiatePayment` → `PaystackWebView` → on success, `JobsContext.refetch()`
  (a new job now exists) + a toast + the existing `isPurchased` success
  card (reworded — it previously described the old fake local-only
  "submitted" state). On error, an inline banner (matches this project's
  established pattern) plus a toast, since a failed/ambiguous payment
  after leaving and returning from a browser session is exactly the kind
  of "no natural inline home at the moment it happens" case the toast
  exists for.

- **`app/jobs/index.tsx`** — added the `paidJobIds` cross-reference
  described above. Fetching `GET /api/payments/my-payments` here is
  best-effort and silently swallowed on failure — it's supplementary
  (a "PAID" pill), not load-bearing, so a failure shouldn't block or
  error the primary jobs list.
  - **`src/components/JobCard.tsx`** — added an optional `paid?: boolean`
    prop (defaults to hidden) rendering a small pill next to the status
    badge. Backward compatible — `dashboard/student.tsx`'s existing
    `<JobCard>` usage doesn't pass it and is unaffected.

- **`app/(app)/(tabs)/profile.tsx`** — new "Payment History" section
  between the spend card and "Account details", using this project's
  established loading/error/empty pattern (matches notifications/
  marketplace). Each row shows date, a status pill (Paid/Pending/Failed,
  reusing the existing `statusApproved`/`statusSubmitted`/`statusFailed`
  theme tokens — no new colors), and the amount.

- **`EXPO_PUBLIC_PAYSTACK_KEY`** added to `.env` (real test key) and
  `.env.example` (placeholder), per the task. **Worth noting honestly:**
  nothing in this implementation actually reads this env var. The
  backend does 100% of the Paystack API interaction server-side (secret
  key only, never exposed to the client) and simply hands the frontend a
  ready-to-use hosted `checkoutUrl` — a browser-redirect flow has no use
  for the public key the way an inline-checkout SDK integration would.
  Added anyway since the task explicitly asked for it, with a comment
  explaining why it's currently unused, rather than silently skipping
  the instruction or silently pretending it's wired to something.

- **Verified:** `npx tsc --noEmit` — zero errors across every change in
  this batch.
- **Not verified — needs a real Paystack test transaction, specifically:**
  1. **The WebView/redirect detection end-to-end** — whether
     `openAuthSessionAsync`'s `redirectUrl` guess ever matches, what
     `result.type` actually comes back as in practice, and whether the
     polling window (7.5s total) is long enough for the webhook to land
     on a real network (versus this being dev-only over a tunnel like
     ngrok, which the backend's own handoff doc recommends for local
     webhook testing).
  2. The actual amount charged vs. displayed (`quote.totalCost`) matches
     what Paystack's checkout page shows.
  3. The `paidJobIds` cross-reference on `jobs/index.tsx` and the
     Payment History list on `profile.tsx` against real completed/failed/
     pending payments.
  4. Whether iOS's `ASWebAuthenticationSession` prompt (asking the user
     to allow the app to authenticate using the given URL) reads as
     confusing/alarming for a payment flow rather than a login flow —
     this is standard `openAuthSessionAsync` behavior, not something
     this code controls.
- **Next:** run a real test transaction (test key is already in `.env`)
  to confirm all four points above. If the backend's job-linking gap
  (no way to pay for an already-approved job) needs closing, that's a
  backend design decision worth a real conversation rather than a
  unilateral frontend workaround — flagged above, not resolved here.

### 2026-07-14 — Submit flow restructure: upload → estimate → pay, both flows now payment-gated
- **Confirmed the audit's key open question before writing anything:**
  read `PaymentService.handleWebhook()` again specifically for this —
  `job.setQuality(linkedEstimate.getQuality())`,
  `job.setMaterial(linkedEstimate.getMaterialType())`,
  `job.setQuantity(linkedEstimate.getQuantity())`, and infill from
  `linkedEstimate.getInfillPercent()`. The webhook pulls every one of
  these straight from the `Estimate` row's own stored values — which are
  saved in the `POST /api/estimates` uppercase format (`DRAFT`/
  `STANDARD`/`HIGH`) — and never calls `mapQuality()` (that logic only
  exists in `PrintJobFacadeController.submitJob()`, the direct-upload
  endpoint this app deliberately never calls per the architecture
  decision). **So: the quality-string mismatch is real but confirmed
  irrelevant to this app's actual flow.** Built `mapQualityForUpload()`
  anyway, per the explicit instruction, in `src/api/utils.ts` — documented
  in its own comment as unused-by-design, kept for if a future direct-
  upload caller ever gets built.

- **New API modules**, all following the established pattern (wire-shape
  type from the real backend source, clean type, adapter):
  - **`src/api/materials.ts`** — `fetchMaterials()` → `GET /api/materials`.
    This one actually has `@JsonProperty` snake_case annotations on the
    backend DTO (unlike notifications/marketplace/files/payments, which
    are all plain un-annotated entities) — typed accordingly.
  - **`src/api/estimates.ts`** — `createEstimate()` → `POST /api/estimates`,
    `fetchEstimate()` → `GET /api/estimates/{id}`. **Important
    implementation detail:** `EstimateController.createEstimate` binds
    every field via `@RequestParam`, not `@RequestBody` — this is a
    query-string request, not a JSON body, unlike every other POST in this
    app so far. Built the query string manually with `encodeURIComponent`
    rather than reaching for the `URLSearchParams` global, since that's
    not guaranteed present in every React Native JS engine — didn't want
    to find that out at runtime on a real device.
  - **`src/api/utils.ts`** — `mapQualityForUpload()`, see above.
  - **`src/api/payments.ts`** — checked per the task; `initiatePayment`
    already accepted `{ estimateId: string | number; listingId?: string |
    number | null }` from the payments batch, which correctly covers both
    the upload flow (`listingId` omitted → `JSON.stringify` drops
    `undefined` keys entirely → backend sees a null `listingId`, exactly
    right) and the marketplace flow. No fix was needed; the `string |
    number` flexibility (vs. the task's suggested `number`) matches this
    codebase's established convention of stringifying every id from the
    adapters (`Payment.estimateId`, `Quote.estimateId`,
    `MarketplaceListing.id` are all `string`), so keeping it a union is
    more consistent, not a bug.

- **`app/(app)/(tabs)/submit.tsx` — full restructure into upload → estimate
  → pay:**
  - **Removed:** the Step-0 upload-vs-marketplace path selector (the
    marketplace branch went nowhere — real marketplace browsing lives
    entirely in `marketplace/index.tsx`), the fabricated client-side cost
    formula (`matPrices`/`qualMult`/`infillCost`), and the fake "Get
    estimate" button whose handler was just `goToTab('marketplace')` with
    no API call at all. Replaced the removed path-selector with a single
    text link ("Looking for a ready-made design instead? Browse the
    marketplace") using the same `goToTab`.
  - **One correction to the task's premise:** quantity wasn't actually
    missing — the original file already had a working quantity stepper
    (`qty` state, +/- buttons, `Math.max(1, qty - 1)` floor). Kept it as
    it was rather than rebuilding something that already worked.
  - **New flow, 2 screens (not 3 — "Step 1" and "Step 2" from the task
    map onto one `configure`/`estimate` step toggle plus a conditionally-
    mounted `PaystackWebView`, not three separately-routed screens):**
    1. **Configure** — file picker (unchanged), material grid now driven
       by `fetchMaterials()` (loading/error/retry state shown inline in
       the material section, not a full-screen blocker — the rest of the
       form doesn't depend on it), quality chips (hardcoded
       `DRAFT`/`STANDARD`/`HIGH` — no listing endpoint exists, per the
       audit), infill slider (range widened from the old 10–80 to the
       backend's actual validated 0–100), quantity stepper (kept as-is),
       color chips — **only shown when the selected material has a
       non-empty `colors[]`** (a `useEffect` resets the selected color
       whenever material changes, so a stale color from a previous
       material can't linger), rendered as swatches via a small local
       `COLOR_SWATCHES` name→hex map (task's suggested common names, plus
       `Clear` for resin) since the backend only ever returns names, never
       hex values. Color is not sent to `createEstimate` — confirmed via
       `EstimateService` that it has zero effect on cost, and it's not a
       parameter that function accepts at all.
    2. **Get Estimate button** → uploads the file for real
       (`uploadFile()`, button reads "Uploading file...") → calls
       `createEstimate()` with the real returned `fileId` (button reads
       "Calculating estimate...") → on success, switches to the estimate
       step. Inline error banner + stays on configure step on failure (no
       job/estimate exists yet at this point, nothing to lose).
    3. **Estimate step** — `totalCost` large and prominent (`GhsAmount`,
       size xl), `estimatedGrams` and `durationMinutes` both displayed
       (rounded for readability) per the task's explicit ask, plus a
       quality/infill/quantity summary card. "Pay Now" (primary) and
       "Back" (secondary, returns to configure **without** clearing any
       state — the same file/material/quality/infill/qty are still there
       if the student wants to adjust and re-estimate).
    4. **Pay Now** → `initiatePayment(token, { estimateId })` — no
       `listingId`, this is the direct-upload path — → mounts
       `PaystackWebView`. **On success:** `JobsContext.refetch()`, a
       success toast ("Your print job has been submitted!"), then
       `goToTab('orders')`. **On cancel:** clears the payment/checkout
       state and stays on the estimate step with the same `estimate` —
       explicitly not re-fetched or re-uploaded, per the task. **On
       error:** inline banner + toast, stays on the estimate step.
  - Since `submit.tsx` is itself one of the swipeable tab pages (rendered
    inside `(tabs)/_layout.tsx`'s `SwipePager`, alongside `orders`), it
    has direct access to `useSwipeTabs()` — `goToTab('orders')` switches
    the pager in place, no stack navigation needed and no risk of landing
    on the wrong tab. This is genuinely simpler than the workaround
    `marketplace/[id].tsx` needed (see next item), not an inconsistency.

- **`app/(app)/marketplace/[id].tsx` — completed per the task:**
  - `initiatePayment` was already being called with both `estimateId` and
    `listingId` correctly (confirmed, no fix needed there).
  - Changed the success behavior from an inline "Payment successful" card
    (the user stayed on the listing) to matching the new consistent
    behavior: `refetchJobs()` + success toast + navigate to the jobs list,
    same as `submit.tsx`. Removed the now-dead `isPurchased` state, the
    inline success card, and the unused `CheckCircle` import.
  - **Routing detail, not a bug:** this screen is a stack route declared
    as a sibling of `(tabs)` in `(app)/_layout.tsx` (reached via
    `router.push` from the marketplace tab) — it is *not* nested inside
    the tabs pager, so it has no `SwipeTabsContext` to call `goToTab`
    against (confirmed by checking the Stack.Screen list; same class of
    limitation flagged for `marketplace/create.tsx` in an earlier batch).
    Used `router.replace('/jobs')` instead — a genuine standalone stack
    route (`app/jobs/index.tsx`) that renders the identical `JobsList`
    component the "orders" tab re-exports, so the destination is
    functionally the same list even though the navigation mechanism
    differs from `submit.tsx`'s `goToTab`. Cancel behavior was already
    correct (stays on the listing, no changes needed).

- **Verified:** `npx tsc --noEmit` — zero errors across every file
  touched.
- **Not verified — needs a live, real test transaction, the full round
  trip specifically:** file upload → `POST /api/estimates` → Paystack
  checkout → webhook fires → `PrintJob` appears in `GET /api/print-jobs`
  → shows up in the jobs list after `refetch()`. Nothing in this batch
  has been exercised against a running backend. In particular:
  1. The query-string request format for `POST /api/estimates` (built
     manually, never executed against a live Spring endpoint from this
     sandbox).
  2. Whether `GET /api/materials`'s hardcoded three materials render
     correctly in the new material grid and that `costPerGram` displays
     sensibly.
  3. The full upload-flow payment round trip end to end, including the
     `PaystackWebView` polling behavior already flagged as unverified in
     the payments batch.
  4. Whether landing on `goToTab('orders')` vs. `router.replace('/jobs')`
     feels consistent to an actual user going through both flows back to
     back.
- **Next:** the real end-to-end test above is the single most valuable
  next step — it would verify four batches of payment/estimate/upload
  work in one pass. After that, the two open architectural questions
  from the payments batch remain: whether `POST /api/print-jobs` (the
  marketplace JSON facade endpoint, which creates a job with no payment
  gate at all) should be deleted/locked down now that the app never calls
  it, and whether the backend needs a real "pay for an already-approved
  job" path for the submit-and-approve flow that still doesn't involve
  payment anywhere today.


---

## Progress Log — 2026-07-16 — Bolt Redesign Pass 1 (visual only)

**Scope executed:** theme tokens, bottom navigation, Home feed, Discover
screen. No API files, backend wiring, payment logic, or navigation
functionality touched.

- **Bolt reference missing:** the task pointed at
  `C:\Users\HP\Desktop\PrintForge-3d\bolt-v2\project\src\` — that path
  does not exist on this machine (searched the repo and Desktop; the only
  similar folder, "PrintForge Web App UI", is a shadcn/Vite web project
  with none of the named files). The task's own spec was detailed enough
  (exact hex tokens, mock data, per-element layout) to implement Pass 1
  without it. If the real reference turns up, diff against it in Pass 2.

- **`src/theme.ts` — forge palette swap.** Dark: bg `#0A182E`, card
  `#152544`, elevated `#1E3460`, primary `#FF6A00` (+ new `primaryLight`
  `#FF8533` token), fg `#FFFFFF`, mutedFg `rgba(255,255,255,0.5)`, border
  `rgba(255,255,255,0.08)`. Light: bg `#F0F2F5`, card `#FFFFFF`, elevated
  `#F8F9FB`, fg `#0A182E`. NO keys were removed — every existing token
  (`secondary`, `muted`, `inputBg`, `overlay`, `sidebar*`, `material*`,
  `chart*`, `printer*`, status colors, legacy `offBlack`/`offWhite`) kept
  so all unmigrated screens still compile; orange-derived values
  (`primarySoft`, `primaryPressed`, `printerBusy`, `chart1`, pending
  status) updated to the new orange. Every screen inherits the new
  palette automatically via ThemeContext.

- **`src/components/SwipeTabBar.tsx` — 5-tab bar w/ floating Upload.**
  Labels/icons now Home(House) / Discover(Search) / Upload(CloudUpload in
  a 56px always-orange circle, marginTop -28 so it floats above the bar)
  / Orders(ClipboardList) / Profile(User). **Decision: internal TAB_KEYS
  ('dashboard'/'marketplace'/'submit'/…) were NOT renamed** — they're
  functional API (`goToTab()` calls in submit.tsx etc.); the task allowed
  "keep key, just change the label/icon" and renaming would have been a
  functional change. Bar surface uses `colors.sidebar` (`#0A182E` dark /
  white light), 60px min height, subtle top border, safe-area padding.
  Inactive tint uses `mutedFg` (0.5 white) instead of the spec's literal
  0.4 so it stays theme-aware — closest existing token. Notifications
  were never in this tab bar (5 tabs before and after); the bell moved
  from the old dashboard header into the new Home top bar.

- **`app/(app)/(tabs)/dashboard/student.tsx` — rebuilt as Home feed.**
  `dashboard/index.tsx` (role router → designer/staff/admin) untouched;
  the student branch is the feed. Fixed top bar (PrintForge wordmark,
  bell → opens NotificationsPanel modal, Trending|Newest segmented
  control — UI state only, no API), FlatList of the 3 spec mock cards
  with local like/follow toggles, "Popular" badge only on trending tab.
  Cards are fixed white-on-navy in BOTH themes (Bolt look, intentional).
  **Mock vs real:** entire feed is mock (no social backend exists). The
  old dashboard's job stats/quick actions are gone from this screen; the
  underlying jobs fetch lives in JobsContext (provider level) and still
  runs — stats can return as a feed section in a later pass. Top bar is
  fixed-above-list rather than absolute+z-index — same sticky effect,
  less overlap risk.

- **`src/components/NotificationsPanel.tsx` — NEW.** Slide-up
  transparent Modal, `colors.card` surface (white light / `#152544`
  dark), X close, 4 spec mock notifications with 4px orange/navy left
  borders. The real notifications route file
  `(tabs)/notifications.tsx` is untouched.

- **`app/(app)/(tabs)/marketplace/index.tsx` — rebuilt as Discover.**
  KEPT: `fetchListings()` + auth-gated effect, loading/error/retry
  states, navigation to `/(app)/marketplace/[id]` — byte-for-byte
  logic. NEW: rounded-full search (local filter on title, as before),
  category pills (UI-only — DesignListing has no category field, noted
  inline), 2-col FlatList grid, orange price badge / emerald `#10B981`
  Free badge. **Decisions:** real listings show `totalOrders` as the
  heart count (no likes field on the backend model — proxy until a
  social model exists); mock grid renders only when the backend returns
  0 listings, and mock cards are non-tappable (a fake id would error on
  the real detail screen). Old featured-rail / category cards / campus
  labs sections (PRINTERS mock) removed from this screen.

- **Verified:** `npx tsc --noEmit` — zero errors.
- **NOT verified — no device attachable from this session:** the three
  on-device checks (5-tab bar with orange circle, feed like/follow
  toggles, Discover grid + pills) need a human run in Expo Go. Watch
  specifically: the floating Upload circle overlapping pager content
  (compensated with paddingBottom 48 on both lists), remote Pexels
  images loading, and light-mode contrast on the segmented control.
- **Pass 2 candidates:** marketplace/[id] detail redesign, orders/
  profile/submit restyling to forge tokens (they inherit colors but keep
  old layouts), real notifications data into the panel, feed backed by a
  real endpoint, category model, restoring job stats on Home.

---

## Progress Log — 2026-07-17 — Bolt Redesign Pass 2 (visual only)

**Scope executed:** auth screens, submit flow, orders, profile, lab
queue, new designer public-profile screen, debug-log cleanup. Zero API
files or payment logic touched; every existing fetch and mutation is
preserved.

- **Bolt reference STILL missing** — `bolt-v2\project\src\screens\` does
  not exist on this machine (re-checked). Implemented from the task's
  own detailed spec, same as Pass 1.

- **`app/(auth)/login.tsx` + `register.tsx` — rebuilt.** Blurred Pexels
  hero + rgba(10,24,46,0.85) overlay, fixed-white centered card (white
  in both themes, like the feed cards), Log In | Sign Up segmented
  switcher (navigates between the two real routes), icon inputs with
  password eye toggle, orange primary buttons. ALL auth logic unchanged
  (login/register payloads, validation, error banners, busy states,
  concrete-leaf `/(app)/(tabs)/dashboard` target). Decisions: single
  "Full name" field (API takes one full_name string; old first/last was
  just concatenated), confirm-password KEPT (validated + required in the
  payload, though the Bolt card omits it), "Forgot password?" shows a
  coming-soon toast (no backend flow), and the register screen's Google
  button is now hidden like login's (it was already known-broken in Expo
  Go — that's why login hid it — and /api/auth/firebase isn't even
  permitAll'd server-side).

- **`app/(app)/(tabs)/submit.tsx` — rebuilt.** 3-step indicator
  (Configure → Estimate → Payment), dashed orange upload zone, material
  pills from the real fetchMaterials() (loading/error/retry kept),
  quality cards (badge shows speed descriptor, NOT a price multiplier —
  the backend's multipliers aren't exposed by any endpoint, so ×N
  numbers would be fabricated), infill slider + strength label, stepper,
  color dots with checkmark. Estimate step: big orange total, 3 stat
  cards (weight/time/specs), summary card, Reconfigure/Pay Now.
  Payment: "Redirecting to payment..." overlay during initiate,
  PaystackWebView unchanged, then an in-screen SUCCESS state (animated
  checkmark, "Track your order" → orders tab, "Back to feed") — this
  replaces the old auto-jump to the orders tab (refetchJobs + toast
  still fire; deliberate UX change per the spec). Cancel now shows a
  gentle banner with Try again/Back — the estimate is kept, exactly as
  before.

- **`app/jobs/index.tsx` (the real Orders screen; (tabs)/orders.tsx
  re-exports it) — rebuilt.** Stats row (active/completed/total spent
  from real jobs), new order cards with color-coded status badges and a
  5-dot progress timeline. Status mapping documented in-file:
  Ready=COMPLETED (no READY status exists), Collected stage is always
  future (no backend status), APPROVED/QUEUED→"Approved"/"Queued" blue,
  PRINTING/IN_PROGRESS→pulsing orange, FAILED/REJECTED→red badge +
  dimmed timeline. Thumbnail is always the Box placeholder — Job has no
  image field. KEPT: paid-pill cross-reference against
  GET /api/payments/my-payments, View Details → /jobs/[id], bell →
  /notifications. Empty state has "Upload Now" (goToTab('submit');
  harmless no-op if rendered via the standalone /jobs stack route).

- **`app/(app)/(tabs)/profile.tsx` — rebuilt.** Now uses the REAL
  appUser (name/email/role) from SessionContext instead of the old
  hardcoded "Kwame Mensah" mock. 80px initials avatar with orange ring,
  Instagram-style stats (Designs/Followers/Following all mock 0),
  designer Earnings = sum of COMPLETED payments (per spec — note this is
  money PAID not earned; flagged for a later pass), Edit Profile =
  coming-soon toast. Role sections: student → Become a Designer button +
  upgrade modal (toast-only confirm — NO upgrade endpoint exists);
  designer → My Designs mock grid; lab_staff → Lab Queue row →
  /staff/queue. "My Orders" lists real payments (tapping a row with a
  printJobId opens /jobs/[id]). Old settings/support/sign-out/theme
  toggle all PRESERVED behind the Settings gear (collapsed by default,
  not deleted). fetchMyPayments trio unchanged.

- **`app/staff/queue.tsx` — rebuilt.** Back-arrow header, local filter
  pills (All/Pending/Printing/Ready), per-job cards (initials avatar,
  student, status pill, spec pills, "Submitted N hours ago"). approveJob
  / rejectJob calls preserved exactly — including the same default
  printerId the old screen sent — with per-card loading and an inline
  expandable rejection-reason input (replaces the old shared notes
  field). "Mark as Ready" / "Mark Collected" render DISABLED with a
  "not wired" caption: the backend's only staff transitions are
  approve/reject, and faking others would be inventing endpoints. The
  old printer-fleet section (pure PRINTERS mock data + mock pickers) is
  gone; Job has no infill%/file-size fields so those two spec pills
  can't be shown.

- **`app/(app)/marketplace/designer/[id].tsx` — NEW (mock).** Public
  designer profile: back arrow, 80px avatar (param or initials),
  verified badge, mock 0/0/0 stats, local Follow toggle, mock design
  grid (thumbnails do NOT navigate — no real listing ids exist for
  them). Registered in (app)/_layout.tsx. Wired from the Home feed's
  designer avatar/name (display fields passed as params — no designer
  endpoint exists). NOT wired from Discover: MarketplaceListing doesn't
  expose designerId and adding it means editing src/api/marketplace.ts,
  which is off-limits this pass.

- **Debug logs removed everywhere:** [Session], [Register], [Submit],
  [Client], [Files], [Index], and the 🔥 loader marker. Kept legitimate
  error logging (ErrorBoundary console.error, signInWithGoogle
  console.warn, marketplace/create console.error, the missing-env-var
  warning in client.ts). Verified by grep: zero console.log left in
  src/ and app/.

- **Verified:** `npx tsc --noEmit` — zero errors.
- **NOT verified — needs a human device run:** every redesigned screen,
  but especially (1) the full submit → estimate → Paystack → success
  round trip (the success/cancel states are new UI around the same
  handlers), (2) staff approve/reject with the new per-card buttons,
  (3) light mode on the fixed-white auth cards and hero overlay.
- **Still outstanding (backend gaps the UI now visibly needs):**
  likes/follows/social model, listing categories, designer upgrade
  endpoint, designer public-profile + per-designer listings endpoints,
  job thumbnails, READY/COLLECTED job statuses + staff transitions
  beyond approve/reject, real designer earnings source, password reset.

## Progress Log — 2026-07-18 — Profile pixel-perfect rebuild + new Following screen (visual only)

**Scope executed:** full rebuild of `app/(app)/(tabs)/profile.tsx` to a
literal pixel spec (hardcoded hex/rgba tokens, not theme-reactive), plus
a new `app/(app)/following.tsx` mock screen. Zero API files, auth logic,
payment logic, or JobsContext touched; `useSession()`, `fetchMyPayments()`,
sign-out, and the ThemeContext dark-mode toggle are all still the same
calls, just restyled around.

- **`profile.tsx` — rebuilt again**, replacing the previous card-based
  pass with the new flat-list/divider aesthetic per spec: single-line
  centered top bar (no gear icon), 72px avatar with orange ring showing
  a single initial, role-gated stats (student = one "Following" stat
  that navigates to the new screen; designer = 4 stats row with real
  Earnings; lab_staff = no stats row), full-width outlined Edit Profile
  button, flat My Orders list with per-row dividers (no card
  background), role-gated Become-a-Designer button with orange shadow,
  and a Settings block with a custom `Animated`-driven dark-mode toggle
  (44×24 track, 20×20 knob, 200ms `Easing.out(Easing.ease)`) wired to
  the existing `toggleTheme`/`isDark` from ThemeContext, Help & Support
  (opens `printforge.com/help` via `Linking`, toast fallback), and Sign
  Out (unchanged `signOut()` → `router.replace('/(auth)/login')`).
  Lab Queue row re-added above Settings for `lab_staff` role, linking to
  `/staff/queue` as before.

- **Order row naming decision:** `Payment` (`src/api/payments.ts`) has
  no name/title field — only `estimateId`, `listingId`, `printJobId`,
  `amount`, `status`, timestamps. Falls back to `"Estimate #{id}"`,
  still run through a `decodeURIComponent` try/catch per spec in case
  that ever becomes a real encoded string. Real job/design names need a
  join the current Payment response doesn't carry.

- **FAILED status badge color — deviation, documented:** spec only
  defined PRINTING/READY/COLLECTED badge colors. Went with the same
  neutral `WHITE_10`/`WHITE_50` treatment as "Collected" rather than a
  red-tinted badge, since RED is already reserved for the destructive
  Sign Out action on the same screen and a red badge next to "your
  payment failed" read as more alarming than warranted. Labeled
  "Failed".

- **Become-Designer modal — built as a custom `Animated` overlay**, not
  RN's `Modal` component: a `View` with `zIndex: 50` +
  `rgba(0,0,0,0.5)` backdrop `Pressable`, and a bottom sheet
  `Animated.View` translating from `Dimensions.get('window').height` to
  `0` on mount/unmount (300ms `Easing.out(Easing.ease)`,
  `useNativeDriver: true`). Matches the spec's slide-up description
  exactly; chosen over `Modal` because the spec described manual
  Animated.Value control over the open/close transition rather than
  `Modal`'s built-in `animationType`.

- **`app/(app)/following.tsx` — new screen**, Stack-registered in
  `(app)/_layout.tsx` (`headerShown: false`, matches the pattern of the
  other Stack.Screen entries there). Back-arrow + centered title +
  "Designers you follow" subtitle header, flat divider-free row list
  (each row has its own `marginBottom`, not a shared border, since the
  spec used a different rhythm than My Orders) with 40px avatar
  (`rgba(255,106,0,0.3)` ring), verified `BadgeCheck`, "{designs} ·
  {followers}" stat line, and a nested Follow/Following pill. Confirmed
  RN's `Pressable`-in-`Pressable` does NOT bubble presses to the parent
  the way DOM does — tapping the follow pill toggles local state only
  and does not also fire the row's `router.push` to the designer
  profile. Backed by 4 hardcoded mock designers (no follow API exists
  yet); tapping a row navigates to the existing
  `/(app)/marketplace/designer/[id]` route passing
  `id`/`name`/`avatar`/`verified` as params — same shape that screen's
  `useLocalSearchParams` already expects (verified by reading that
  file), so no changes were needed there.

- **Verified:** `npx tsc --noEmit` — zero errors. Grepped both new/changed
  files for `console.log` — none found. Confirmed via `git status` that
  no file under `src/api/`, `SessionContext`, or `JobsContext` was
  touched.
- **NOT verified — needs a human device run:** the animated dark-mode
  toggle's visual interpolation, the bottom-sheet slide animation
  timing/feel, and whether `printforge.com/help` is a real reachable
  URL (falls back to a toast if `Linking.openURL` rejects, so it fails
  soft either way).
- **Still outstanding:** real Following/Followers/Designs counts (all
  still mock `0` on profile.tsx), a real follow-toggle API for
  following.tsx (currently local state only, resets on remount), and a
  job/design name field on the Payment response so My Orders can show
  something better than `Estimate #{id}`.
