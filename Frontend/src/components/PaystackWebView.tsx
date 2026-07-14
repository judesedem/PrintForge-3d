import { useEffect, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { fetchPayment, Payment } from '@/api/payments';

type Props = {
  checkoutUrl: string;
  paymentId: string;
  token: string;
  onSuccess: (payment: Payment) => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

// The backend's PaymentService.callPaystackInitialize() doesn't send a
// callback_url to Paystack at all (checked PaymentService.java directly) —
// whatever Paystack redirects to after checkout is entirely a Paystack
// *dashboard* setting, external to this codebase, with no visibility from
// here. This is a best-effort guess (this app's own scheme, from
// app.json's "scheme": "printforge") for openAuthSessionAsync's
// redirectUrl, matched or not.
const REDIRECT_URL = 'printforge://payment-callback';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 5;

/**
 * Not a visual <Modal>/<WebView> — expo-web-browser's openAuthSessionAsync
 * already presents its own full-screen native browser sheet (SFSafariViewController
 * on iOS, Custom Tabs on Android), which is the officially-recommended API
 * for exactly this "hosted checkout page + redirect back to the app"
 * pattern (same category as OAuth). react-native-webview isn't installed
 * in this project, and expo-web-browser already is — per the task's own
 * "check what's already available before adding a dependency," no new
 * dependency was needed. This component is a controller with no JSX of
 * its own (renders null); mount it conditionally to trigger a checkout.
 *
 * Since the real redirect destination is unknown (see REDIRECT_URL
 * comment), this does NOT trust openAuthSessionAsync's own result type as
 * the source of truth for success/failure — it always re-checks
 * GET /api/payments/{id} afterwards, which reflects what the backend's
 * webhook actually confirmed with Paystack's API server-side. The webhook
 * fires asynchronously and isn't guaranteed to have landed by the moment
 * the browser closes, so this polls with a short bounded retry rather than
 * checking once.
 */
export default function PaystackWebView({ checkoutUrl, paymentId, token, onSuccess, onCancel, onError }: Props) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      let browserResult: WebBrowser.WebBrowserAuthSessionResult;
      try {
        browserResult = await WebBrowser.openAuthSessionAsync(checkoutUrl, REDIRECT_URL);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Could not open the payment page.');
        return;
      }

      // A confident "the user backed out before doing anything" signal
      // (iOS-only) — worth a quick single check rather than the full
      // retry budget, but still verified against the backend rather than
      // trusted blindly (they may have paid and closed at an odd moment).
      const quickCheckOnly = browserResult.type === 'cancel';
      const attempts = quickCheckOnly ? 1 : MAX_POLL_ATTEMPTS;

      try {
        for (let attempt = 0; attempt < attempts; attempt++) {
          const payment = await fetchPayment(token, paymentId);
          if (payment.status === 'COMPLETED') {
            onSuccess(payment);
            return;
          }
          if (payment.status === 'FAILED') {
            onError('Payment failed. You can try again from your payment history.');
            return;
          }
          if (attempt < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
          }
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Could not confirm payment status.');
        return;
      }

      if (quickCheckOnly) {
        // Confirmed still PENDING after the user's own cancel signal —
        // safe to treat as a genuine cancellation.
        onCancel();
      } else {
        // Ran the full retry budget and still PENDING. Deliberately NOT
        // treated as a cancel — the webhook may simply not have landed
        // yet, and a charge could still be in flight. Silently calling
        // this "cancelled" risks the user retrying and being charged
        // twice, so it's routed through onError with a message that
        // doesn't claim failure either.
        onError(
          "We couldn't confirm your payment yet. Check My Payments in a few minutes before trying again."
        );
      }
    })();
  }, [checkoutUrl, paymentId, token, onSuccess, onCancel, onError]);

  return null;
}
