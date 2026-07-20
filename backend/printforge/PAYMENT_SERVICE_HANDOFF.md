# PAYMENT_SERVICE_HANDOFF.md

## What was built

A complete `paymentservice/` that gates `PrintJob` creation behind a confirmed
Paystack payment. Nothing in the existing codebase was restructured — only the
three minimal changes listed below were made to existing files.

---

## New files

```
src/main/java/com/printforge/printforge/paymentservice/
  model/Payment.java
  repository/PaymentRepository.java
  dto/InitiatePaymentRequest.java
  exception/PaymentNotFoundException.java
  exception/PaymentFailedException.java
  service/PaymentService.java
  controller/PaymentController.java
```

---

## Changes to existing files

### 1. `SecurityConfig.java`
Added `/api/payments/webhook` to the `permitAll` list so Paystack can POST to
it without a JWT.

### 2. `GlobalExceptionHandler.java`
Added two imports and two `@ExceptionHandler` methods for
`PaymentNotFoundException` (404) and `PaymentFailedException` (502).

### 3. `application.properties`
Added:
```properties
paystack.secret-key=${PAYSTACK_SECRET_KEY}
```

---

## Environment variable required

| Variable              | Where to get it                                              |
|-----------------------|--------------------------------------------------------------|
| `PAYSTACK_SECRET_KEY` | Paystack dashboard → Settings → API Keys & Webhooks          |

Use `sk_test_...` during development. Switch to `sk_live_...` before production.
Add it to your `.env` file (already loaded via `spring-dotenv`):

```
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## API endpoints

| Method | Path                       | Auth    | Description                                  |
|--------|----------------------------|---------|----------------------------------------------|
| POST   | `/api/payments/initiate`   | JWT     | Creates PENDING payment + returns checkout URL|
| POST   | `/api/payments/webhook`    | None    | Paystack webhook — do not call this yourself  |
| GET    | `/api/payments/{id}`       | JWT     | Get a payment (owner only)                   |
| GET    | `/api/payments/my-payments`| JWT     | All payments for the authenticated user       |

---

## The full user flow

```
1. User browses GET /api/marketplace
2. User taps a listing → GET /api/marketplace/{id}
   └─ Returns listing + auto-generated quote (Estimate saved, has an id)
3. User confirms order → POST /api/payments/initiate
   Body: { "estimateId": 42, "listingId": 7 }
   └─ Returns Payment with status=PENDING and checkoutUrl
4. Frontend redirects user to checkoutUrl (Paystack hosted page)
5. User pays on Paystack
6. Paystack POSTs to /api/payments/webhook
   └─ Signature verified (HMAC-SHA512)
   └─ Re-verified against Paystack API (/transaction/verify)
   └─ Payment marked COMPLETED
   └─ PrintJob created (status=SUBMITTED) ← the gate
   └─ payment.printJobId linked back
   └─ listing.totalOrders++ and totalEarnings updated (if marketplace order)
```

For a **direct order** (user's own file, not marketplace), omit `listingId`:
```json
{ "estimateId": 42 }
```
The `fileId` is then taken from the estimate itself.

---

## Payment model fields

| Field               | Notes                                                       |
|---------------------|-------------------------------------------------------------|
| `id`                | PK                                                          |
| `userId`            | Who is paying                                               |
| `estimateId`        | The estimate driving the cost                               |
| `listingId`         | Nullable — set only for marketplace orders                  |
| `printJobId`        | Null until webhook fires and job is created                 |
| `amount`            | Total in GHS (estimate cost + listing base_price)           |
| `currency`          | Always "GHS" for now                                        |
| `status`            | PENDING → COMPLETED or FAILED                               |
| `paystackReference` | Unique ref sent to Paystack; used to match webhook          |
| `checkoutUrl`       | Paystack hosted checkout page — redirect user here          |
| `initiatedAt`       | Set on creation                                             |
| `completedAt`       | Set when webhook confirms                                   |

---

## Paystack webhook setup

In your Paystack dashboard → Settings → API Keys & Webhooks, set the webhook
URL to:

```
https://<your-domain>/api/payments/webhook
```

During local development use a tunnel (ngrok, cloudflare tunnel, etc.) to expose
port 8080. Example:
```
ngrok http 8080
# Then set webhook URL to: https://xxxx.ngrok.io/api/payments/webhook
```

---

## What's NOT done (intentional — needs your input)

1. ~~**FAILED status on bad payments**~~ — **Done.** `charge.failed` webhook events
   mark the Payment as FAILED. The frontend can poll `GET /api/payments/{id}`
   and show a retry screen when status is FAILED.

2. ~~**Retry / re-initiate**~~ — **Done.** `POST /api/payments/{id}/retry`
   resets a FAILED or PENDING payment with a fresh Paystack reference and
   checkout URL. Same amount, same estimate — no recalculation.

3. ~~**Notification on payment completion**~~ — **Done.** After a successful webhook
   the user receives a "Payment Confirmed" notification: *"Your payment was
   successful. Your print job has been submitted and is in the queue."*

4. **Admin visibility** — there's no admin endpoint to list all payments.
   `AdminService` / `AdminController` could be extended if needed.
