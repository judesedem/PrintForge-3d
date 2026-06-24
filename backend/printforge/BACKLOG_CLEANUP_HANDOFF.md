# PrintForge 3D — Remaining Backlog Cleanup (CORS, JWT secret, DELETE printer)

Scope: the small/cosmetic items left on the list, done together since none of them needed the
kind of dedicated design work the bigger fixes did. One item (printer status cascading) is
flagged but **not built** — see the bottom, it needs your input first.

## 1. CORS — now configured (with an important correction)

There was no CORS configuration anywhere before. While building this I checked your actual
frontend code and found it's **Expo/React Native** (`API_BASE` defaults to `http://10.0.2.2:8080`,
the Android-emulator alias for your host machine) — not a Vite web app as I'd assumed earlier in
this conversation. That matters: **CORS is enforced by browsers only.** Native HTTP requests from
Expo Go or a built Android/iOS app never send an `Origin` header and aren't subject to CORS at
all. So this was never actually blocking your mobile testing — it only matters if you run
`expo start --web`.

Built it anyway since it's cheap and you'll want it eventually:

- New `CorsConfigurationSource` bean in `SecurityConfig`, wired into the filter chain via
  `.cors(...)`.
- Allowed origins come from `app.cors.allowed-origins` in `application.properties` (comma-
  separated), not a wildcard — defaults to `http://localhost:8081`, `http://localhost:19006`
  (Expo's web dev ports) and `http://localhost:3000`. Add your own if you test `--web` from
  somewhere else.
- `allowCredentials` is `false` — you're not using cookies, just a Bearer token in the
  `Authorization` header, so there's no reason to enable it (and a wildcard origin + credentials
  is invalid per the CORS spec anyway, which is the actual misconfiguration CORS warnings usually
  mean).

**Files:** `config/SecurityConfig.java`, `application.properties`.

## 2. JWT secret — externalized

`jwt.secret` was a hardcoded plaintext value. Changed to:
```
jwt.secret=${JWT_SECRET:4b6250655368566d597133743677397a244226452948404d6351665468576d5a}
```
If a `JWT_SECRET` environment variable is set, it's used; otherwise it falls back to the existing
value so nothing breaks on a fresh clone with no setup. **The fallback is still a secret sitting
in a file** — this change makes it *possible* to externalize, it doesn't retroactively secure the
old value. Set a real `JWT_SECRET` env var before this repo is ever public or deployed anywhere
that isn't your own machine.

**File:** `application.properties` (no code change needed — `JwtService` already read `jwt.secret`
via `@Value`, it just needed the property itself to support being overridden).

## 3. `DELETE /api/admin/printers/{id}` — added

Didn't exist before — a typo'd printer name had no way to be removed, only its status could be
changed. LAB_STAFF/ADMIN only, same as the rest of `/api/admin/printers`. Throws the existing
`PrinterNotFoundException` (404) for an unknown id.

**Files:** `printerservice/service/PrinterService.java` (`deletePrinter`), `adminservice/controller/AdminController.java`.

### New/updated tests

`PrinterServiceTest` gained two cases: deleting an existing printer calls `deleteById`, deleting an
unknown one throws 404 without calling `deleteById`.

## ⚠️ Still not run/tested by me

```bash
cd backend/printforge
./mvnw compile
./mvnw test -Dtest=PrinterServiceTest
```
Expect `BUILD SUCCESS`, `Tests run: 7, Failures: 0, Errors: 0`.

### Postman: quick checks

1. `DELETE /api/admin/printers/{a real id}` as LAB_STAFF/ADMIN → `204 No Content`.
2. Same call again on the same id → **404** (already gone).
3. As STUDENT → **403**.
4. CORS itself isn't really Postman-testable (Postman doesn't enforce CORS, browsers do) — if you
   want to actually verify it, you'd need to hit the API from `expo start --web` or a tiny
   browser-based fetch() test page.

## Not done — needs your call first, not a guess

### `docs/API_CONTRACT.MD` is out of sync with the real routes
That file lives in your full project zip, which isn't what I've been working from for several
turns now (just the `backend/` folder) — I didn't want to silently edit a doc I can't verify is
still in sync with your actual repo. The drift, for your own update whenever convenient:
- Contract says `POST/GET /api/print-jobs`; actual implementation is `/api/queue`.
- Contract says `GET /api/estimates/{jobId}`; actual implementation is `GET /api/estimates/{id}`
  (by estimate id — necessary since an estimate is created *before* a job exists, Queue Service's
  `createPrintJob` takes an existing `estimateId` as input).

### Automatic printer-status cascading — flagging again, deliberately not building it

This is the one real "next issue" left, and I don't want to guess at the design:

- Should assigning a printer to a job (`PATCH /{jobId}/status?printerId=X`) automatically flip
  that printer to `BUSY`?
- If so, what happens if staff *reassigns* the job to a different printer mid-print — does the
  old printer go back to `AVAILABLE` automatically, or does that need a separate manual step?
- Should completing or failing a job automatically flip its printer back to `AVAILABLE`?
- What if two jobs somehow reference the same printer at once — is that even possible to prevent,
  or just something the UI should warn about?

Each of these has a reasonable-sounding default, but they interact (reassignment + completion +
failure all touch the same printer's status), and guessing wrong means rebuilding it later. Happy
to build whichever version you want once you've thought through how you want it to behave —
or we can leave printer status fully manual (staff updates it themselves via
`PUT /api/admin/printers/{id}/status`) and not automate it at all, which is also a legitimate
choice for a CODEQUEST-scope project.
