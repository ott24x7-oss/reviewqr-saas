# Own UPI gateway

The manual UPI gateway uses the existing payment amount and activation flow, with bank credits captured in a shared ledger from SMS, Gmail, or IMAP. A credit can be claimed once. A payment or shop order can claim one credit. Ambiguous amounts stay in Admin → Payments for review.

## Configure

1. Set `APP_ENCRYPTION_KEY` before pairing devices. The SMS device signing key and Gmail OAuth secrets use the app's existing encrypted settings storage.
2. In Admin → Payments, set the UPI VPA and payee name, enable UPI, and select **Own UPI gateway (SMS + email)** as the active gateway.
3. For email alerts, enable email verification and configure IMAP, or enter the Gmail OAuth client ID and secret and connect Gmail. Add this exact redirect URI to the Google OAuth client:

   `https://<app-host>/api/admin/settings/payments/gmail/callback`

   The app requests the `gmail.readonly` scope. An email is accepted only when its parsed sender domain is allowed and a DKIM pass in the first `Authentication-Results` header aligns to that domain (or an allow-listed parent domain). The receiver ID must be trusted; it defaults to `mx.google.com` and can be configured as a comma-separated list in payment settings. Later `Authentication-Results` headers and ARC results are ignored for verification.
4. The app's Node.js process checks for pending own-UPI payments and runs `billing.reconcile` every minute while any are pending. No external cron or manual schedule is required. `POST /api/billing/reconcile` remains available for an authenticated admin or an optional `x-cron-secret` caller.

## Pair the existing APK

Open Admin → Payments → Own UPI gateway → SMS gateway, then choose **Create pairing QR**. In the unchanged APK, scan or paste the QR in **Pair this phone**. The QR uses the app origin with no path, for example `https://app.example.com`, and expires after 10 minutes. Pairing is single use.

The QR JSON follows the APK's existing format:

```json
{"type":"YOUPI_SMS_GATEWAY_PAIR","version":"v1","serverUrl":"https://app.example.com","enrollmentToken":"…","merchantId":"qr24x7","expiresAt":1790000000000}
```

The server implements the APK endpoints under `/api/v1/`: pairing, signed SMS events (including the `/pollers/android/events` alias), heartbeat, and the empty SMS outbox. Device status becomes online when its last heartbeat is under six minutes old. Revoke a device from the same admin tab.

UPI checkouts show a QR with the exact amount, the `upi://pay` intent, a 15-minute timer, automatic status checks, and an optional UTR field. Shop orders use the advance amount when the order is configured for an advance.
