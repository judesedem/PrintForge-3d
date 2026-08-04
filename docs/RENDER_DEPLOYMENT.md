# Deploying the PrintForge backend to Render

All eight services deploy from [`render.yaml`](../render.yaml) as a Render
Blueprint, built from the single parameterized [`backend/Dockerfile`](../backend/Dockerfile).
Render passes each service's environment variables to `docker build` as build
arguments, so the `MODULE_NAME` variable is what picks the Maven module.

This blueprint targets the **free** instance type with an **external Postgres**
(the Neon database you already use). Read "Free-tier realities" before you rely
on it for a demo.

---

## 1. Before the first sync

Two things in `render.yaml` cannot be changed after the services are created:

| Setting | Current value | Change it if |
| --- | --- | --- |
| `region` | `virginia` | You move the database. It's set to `virginia` because the Neon database is in `us-east-1` — JPA issues many queries per request, so co-locating with the database costs one transatlantic hop per request rather than one per query, even though Frankfurt is closer to users in Ghana. |
| `type` / `runtime` | `web` / `docker` | Never, for this setup. |

Commit `render.yaml` to the branch you want Render to track, and push.

## 2. Create the Blueprint

1. Render Dashboard → **New** → **Blueprint**.
2. Pick the `PrintForge-3d` repo and the branch with `render.yaml`.
3. Render reads the file and prompts for every variable marked `sync: false`.
   Fill them in from your `backend/.env` (see the table below).
4. **Apply**. Render builds all eight services in parallel. Expect **5–10
   minutes** — each service builds its own module plus the parent POM.

### Values Render will prompt for

| Group / service | Variable | Notes |
| --- | --- | --- |
| `printforge-db` | `DB_URL` | Full JDBC URL, e.g. `jdbc:postgresql://ep-xxx.eu-central-1.aws.neon.tech/printforge_db?sslmode=require`. Must start with `jdbc:` — a bare `postgres://` URL will not parse. |
| `printforge-db` | `DB_USERNAME`, `DB_PASSWORD` | |
| `printforge-jwt` | `JWT_SECRET` | Base64, at least 32 bytes for HS256. **Identical** across gateway, auth and admin, or tokens minted by auth will fail verification at the gateway. |
| `printforge-cloudinary` | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Used by order + marketplace uploads. |
| `printforge-mail` | `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | Gmail needs an app password, not the account password. |
| `printforge-mail` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seeds the first admin on notification/admin startup. |
| `printforge-payment` | `PAYSTACK_SECRET_KEY` | |
| `printforge-auth` | `FRONTEND_RESET_PASSWORD_URL` | Where password-reset emails point. |
| `printforge-api-gateway` | `*_SERVICE_URL` (7 of them) | **Leave blank on the first pass** — see step 3. |

## 3. Wire the gateway to the other services

This step is unavoidably manual, and it's the one that trips people up.

Free web services **can send private-network requests but cannot receive them**,
so the gateway has to call the other seven over their public URLs. Render has no
blueprint reference for a service's public URL (`fromService` only exposes
private-network host/port), so these can only be filled in once the services
exist and their URLs are known.

After the first sync completes:

1. Open each service and copy its URL from the top of its page. It's usually
   `https://<name>.onrender.com`, but **Render appends a random suffix if the
   name is already taken globally** — copy the real one, don't assume.
2. Go to **printforge-api-gateway → Environment** and set:

   ```
   AUTH_SERVICE_URL          = https://printforge-auth.onrender.com
   PRINTER_SERVICE_URL       = https://printforge-printer.onrender.com
   ORDER_SERVICE_URL         = https://printforge-order.onrender.com
   MARKETPLACE_SERVICE_URL   = https://printforge-marketplace.onrender.com
   PAYMENT_SERVICE_URL       = https://printforge-payment.onrender.com
   NOTIFICATION_SERVICE_URL  = https://printforge-notification.onrender.com
   ADMIN_SERVICE_URL         = https://printforge-admin.onrender.com
   ```

   No trailing slashes. `https://`, not `http://`.
3. Save — the gateway redeploys automatically.

## 4. Point the app at the gateway

In `Frontend/.env` (or your EAS build config):

```
EXPO_PUBLIC_API_URL=https://printforge-api-gateway.onrender.com
```

That's the only backend URL the app needs — everything routes through the
gateway. The gateway's CORS config already allows all origins.

## 5. Verify

```bash
curl -i -X POST https://printforge-api-gateway.onrender.com/api/auth/register \
  -H 'Content-Type: application/json' -d '{}'
```

A **400** (validation error) means the whole chain works: gateway matched the
route, proxied to auth-service, and got a real application response. A **503**
means the gateway couldn't reach the downstream service — recheck the
`*_SERVICE_URL` value. The first call after idle may take up to two minutes
while both services wake.

---

## Free-tier realities

Worth knowing before a live demo:

- **Cold starts chain.** Free services spin down after 15 minutes idle and take
  ~1 minute to wake. A first request wakes the gateway *and* the downstream
  service — up to two minutes, and mobile clients may time out first. Hit the
  gateway a few minutes before any demo.
- **750 instance-hours per month, shared across all eight services.** Eight
  always-on services would need ~5,800. It works because idle services burn
  nothing, but sustained traffic across all eight will exhaust the budget in
  well under a month.
- **Every service is publicly reachable.** On the free plan the seven backend
  services get their own `onrender.com` URLs, so anything calling them directly
  bypasses the gateway's `JwtAuthenticationFilter`. Services do their own Spring
  Security checks, but the gateway's role check is skipped. To close this,
  upgrade the seven to Starter and change their `type` from `web` to `pserv`,
  then swap the gateway's `*_SERVICE_URL` values for `fromService`
  host references on the private network.
- **No RabbitMQ.** Render has no managed broker. The services already treat it
  as optional — `RabbitMQConfig` and the `UserEventListener`s are
  `@ConditionalOnProperty(spring.rabbitmq.host)`, and `RabbitAutoConfiguration`
  is excluded by default — so user-deleted fan-out events are simply not
  emitted. To restore messaging, provision CloudAMQP and set
  `SPRING_RABBITMQ_HOST` (plus `SPRING_RABBITMQ_USERNAME`/`PASSWORD`/`PORT`) and
  an empty `RABBITMQ_EXCLUDE` on auth, admin, order, marketplace and
  notification.

## Troubleshooting

**Build fails on a Maven download.** The Dockerfile already retries five times
with a cached `~/.m2`. If it still fails, redeploy — Maven Central hiccups are
the usual cause.

**Service builds but never goes live.** Render waits for a bound port. Each
service's `application.properties` reads `server.port=${PORT:<default>}` and
`render.yaml` sets `PORT` explicitly per service; if you remove that variable
Render's default (10000) still works, but don't set `PORT` to 10000, 18012,
18013 or 19099 — those are reserved on Render's private network.

**`Connection refused` to the database.** Neon requires TLS: append
`?sslmode=require` to `DB_URL`.

**Everything 401s after a redeploy.** `JWT_SECRET` differs between the gateway
and auth-service. It lives in the `printforge-jwt` env group precisely so all
three services share one value — check none of them has a local override.

**Out of memory / restart loops.** Free instances get 512 MB; the Dockerfile
caps the heap at `-Xmx400m`. Lower it before adding heavy dependencies.
