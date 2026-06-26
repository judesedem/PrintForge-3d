# PrintForge 3D — Auth Service Fix (role bug + status codes)

Scope: **Auth Service only** — fixing the 3 issues flagged in the earlier audit. This unblocks
creating a LAB_STAFF/ADMIN account, which Notification Service's "staff override" path needs to
actually be testable.

## The bugs

1. **`register()` ignored `request.getRole()` and hardcoded `Role.STUDENT`.** No way to create a
   LAB_STAFF or ADMIN account through the API at all, even though `RegisterScreen.tsx` has a full
   role picker that sends the choice.
2. **`/api/auth/**` permitAll wildcard was too broad.** It covered `/me` and `/logout`, not just
   `/register`/`/login`. Hitting `/me` with no token let the request through unauthenticated,
   `@AuthenticationPrincipal` came back null, and the controller NPE'd — caught by the generic
   handler as a 500 instead of a clean 401.
3. **Auth failures returned 403 instead of 401.** `JwtAuthEntryPoint` (fires for missing/invalid
   tokens) returned `FORBIDDEN`. Worth calling out: `Frontend/src/services/api.ts` has a "Global
   401 handler" — `registerUnauthorizedHandler` — that's supposed to catch expired/invalid
   sessions from *any* endpoint and log the user out. **That handler could never have fired**,
   because the backend was sending 403, not 401. This wasn't just a status-code nitpick — it was
   silently breaking the frontend's session-expiry handling.

## What changed

| # | Fix | Files |
|---|-----|-------|
| 1 | `register()` now calls `resolveRole(request.getRole())` — parses the role case-insensitively (`"admin"`, `"ADMIN"`, `"Admin"` all work), defaults to `STUDENT` if the field is missing/blank, and throws a new `InvalidRoleException` (→ 400) for anything that isn't a real role, instead of either silently ignoring it or crashing with an unhandled `IllegalArgumentException`. | `service/AuthService.java` |
| 2 | New `InvalidRoleException`, wired into `GlobalExceptionHandler` → 400. | `exception/InvalidRoleException.java` (new), `exception/GlobalExceptionHandler.java` |
| 3 | `SecurityConfig`'s permitAll narrowed to exactly `/api/auth/register` and `/api/auth/login`. `/me` and `/logout` now require a valid token like everything else. | `config/SecurityConfig.java` |
| 4 | `JwtAuthEntryPoint` now returns `401 Unauthorized` / `"Authentication required"` instead of `403 Forbidden` / `"Access denied"`. The existing `AccessDeniedException` handler still returns 403 for genuine authorization failures (e.g. a STUDENT hitting a staff-only endpoint) — so 401 and 403 now mean different things, as they should. | `security/JwtAuthEntryPoint.java` |
| 5 | New unit test (`AuthServiceTest`, Mockito, no DB) — proves `register("admin")` actually produces `Role.ADMIN`, `LAB_STAFF` is case-insensitive, missing role defaults to `STUDENT`, and garbage input (`"doctor"`) is rejected rather than silently defaulting. | `service/AuthServiceTest.java` (new) |

### ⚠️ Deliberate tradeoff — read before testing

`resolveRole` honors *whatever role the client sends*, including `ADMIN`. That means right now,
**anyone can self-register as an admin** just by sending `role: "admin"`. I did this on purpose so
you can actually bootstrap your first admin account (there's no other way to create one, since no
admin exists yet to use an admin-only endpoint). This is fine for development, but flag it for
later: once you have at least one real admin, it's worth locking `/api/auth/register` down to
`STUDENT` only, and adding a separate `ADMIN`-only endpoint for creating LAB_STAFF/ADMIN accounts.
I didn't do that now because it would've immediately blocked the thing you're trying to do.

## ⚠️ Still not run/tested by me — same sandbox limitation as every prior fix

```bash
cd backend/printforge
./mvnw compile
./mvnw test -Dtest=AuthServiceTest
```
Expect `BUILD SUCCESS` and `Tests run: 4, Failures: 0, Errors: 0`.

### Postman: create your admin account

```
POST /api/auth/register
{
  "full_name": "Admin User",
  "email": "admin@knust.edu.gh",
  "password": "password123",
  "role": "admin"
}
```
Expect `201 Created` with the response's `user.role` = `"admin"`. Then `POST /api/auth/login`
with those same credentials to confirm login still works and returns the same role.

### Postman: confirm the status-code fixes

- `GET /api/auth/me` with **no** Authorization header → should now be **401**, not 500.
- `GET /api/auth/me` with a garbage/expired token → should be **401** (was 403 before).
- (Once Notification Service is in play) a STUDENT hitting a LAB_STAFF-only endpoint should still
  be **403** — that path is unchanged and should still work via `AccessDeniedException`.

## Known gaps, still not touched

- The self-elevation tradeoff above — lock down once you have a real admin account.
- Estimate Service and Queue Service still have the authorization/ownership gaps from the original
  audit (anyone can create a job as anyone else, anyone can update any job's status, no GET on
  estimates). Next in line.
