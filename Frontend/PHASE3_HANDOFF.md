# PrintForge 3D — Phase 3 Handoff (Group 42 / KNUST CODEQUEST 2026)

This pass completes the outstanding wiring tasks from the Phase 2 handoff.

## Completed

| # | Item | Files |
|---|------|-------|
| 1 | `AdminDashboard.tsx` — added `onOpenQueueManagement?` / `onOpenPrinterManagement?` props + two quick-action buttons in the Overview tab | `src/screens/AdminDashboard.tsx` |
| 2 | `JobsScreen.tsx` — real API wiring via `apiGetJobs()`, with loading/error/retry + pull-to-refresh | `src/screens/JobsScreen.tsx` |
| 3 | `NotificationsScreen.tsx` — real API wiring via `apiGetNotifications()` / `apiMarkNotificationRead()` / `apiMarkAllNotificationsRead()`, optimistic updates with rollback on failure | `src/screens/NotificationsScreen.tsx` |
| 4 | `HomeScreen.tsx` — real API wiring via parallel `apiGetJobs()` + `apiGetNotifications()` calls, loading/error/retry states | `src/screens/HomeScreen.tsx` |
| 5 | `JobDetailScreen.tsx` — real approve/reject wiring. Approve opens an inline panel that fetches idle printers (`apiGetPrinters()`), collects cost/time estimates, and calls `apiApproveJob()`. Reject calls `apiRejectJob()` behind a confirmation alert. | `src/screens/JobDetailScreen.tsx` |
| 6 | `EstimateResult.tsx` — new screen shown after a successful approval; cyan-accented success treatment matching the existing theme | `src/screens/EstimateResult.tsx` |
| 7 | `App.tsx` — wires `EstimateResult` into the modal flow after approval; wraps the app in `ErrorBoundary` | `App.tsx` |
| 8 | `ErrorBoundary.tsx` — new component catching uncaught render-time errors, with themed fallback UI that distinguishes `ApiError` (401 / 5xx) from network/generic errors | `src/components/ErrorBoundary.tsx` |
| 9 | `app.json` — added `expo.extra.eas.projectId` slot; removed stale `expo-router` plugin / `typedRoutes` left over from an earlier scaffold (this app uses the state-based navigator in `App.tsx`, not expo-router) | `app.json` |
| 10 | `usePushNotifications.ts` — now reads the real project ID via `Constants.expoConfig?.extra?.eas?.projectId` instead of `undefined`, with a guard that warns and skips registration if the placeholder ID hasn't been replaced | `src/hooks/usePushNotifications.ts` |
| 11 | `package.json` — added `expo-constants` dependency (required for #10) | `package.json` |

### Breaking prop rename (JobDetailScreen)

`onApprove?: (id: string) => void` / `onReject?: (id: string) => void` were replaced with:

```ts
onApproved?: (estimate: { cost: number; time: number; job_id: string }) => void;
onRejected?: (jobId: string) => void;
```

The screen now performs the actual API call itself (it needs to collect a printer + cost/time before it can call `apiApproveJob`), so the old "just close the modal" callbacks no longer fit. `onApproved` fires only after the API call succeeds, carrying the data `EstimateResult` needs. `App.tsx` is already updated to match.

---

## Outstanding — one manual step left

**Replace the placeholder in `app.json`:**
```json
"extra": { "eas": { "projectId": "REPLACE_WITH_YOUR_EAS_PROJECT_ID" } }
```
Run `eas init` (or check your Expo dashboard) for the real value, then swap it in. Until this is done, push notifications will no-op with a console warning rather than crash — but they won't actually register tokens with the backend.

After installing dependencies, also run `npx expo install expo-constants` (or just `npm install`, since it's already declared in `package.json`) to make sure the new dependency is actually present in `node_modules`.

## Known pre-existing items, unchanged (flagged, not in scope this pass)

- `AdminDashboard.tsx`'s Pending/Printers tabs and `ProfileScreen.tsx` still read from `MOCK_JOBS` / `MOCK_PRINTERS` elsewhere in their bodies. Only the two requested props/buttons were added to `AdminDashboard`, per the original task scope.
- A global error-event-bus module for catching errors *outside* the React render tree (unhandled promise rejections, background sync failures) was sketched in an earlier pass but never wired in (no consumer UI, handler-installer never called) — it was deliberately removed before packaging rather than shipped as dead code. `ErrorBoundary` (done) covers render-time crashes only; the unhandled-rejection case remains a gap if you want to close it later.
