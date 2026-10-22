# Play Billing note

Digital plans (ReviewQR subscriptions) sold inside an app distributed on Google Play must use Google Play Billing. As of October 2026, India allows a user-choice billing alternative only beside Play Billing. Google still charges a service fee on those transactions, reduced by 4 percentage points from the Play Billing fee. Offering YouPI alone for a digital plan would breach the policy.

Physical QR stands and NFC cards are goods. Those stay on the existing YouPI checkout. The app opens the server `checkoutUrl` and never creates the payment itself.

`EXPO_PUBLIC_SELL_PLANS` defaults to `0`. While it is off, the app shows the current plan, the expiry date, and payment history from `GET /api/v1/billing/summary`. It does not sell a digital plan. Turning the flag on does not start a charge until Play Billing (or India user-choice billing beside it) is wired.
