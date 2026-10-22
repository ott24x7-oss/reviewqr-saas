# Play Billing note

Decision, October 2026: the Android app does not sell digital plans.

The app must not show plan prices, a "buy on website" link, or any other steering toward an external payment for a digital plan. Google Play's payments policy requires Play Billing for digital subscriptions sold in the app. India allows a user-choice billing option only beside Play Billing, and Google still charges a service fee on those transactions.

Plans are bought on the ReviewQR website with the existing YouPI checkout. The app reads entitlements from `GET /api/v1/subscription` and unlocks modules on its own. It refreshes that response on pull-to-refresh, when the app returns to the foreground, and when a push arrives with the title "Your plan is active". The plan screen shows the current plan name, the included modules, the expiry date, and payment history. It does not start a purchase.

`EXPO_PUBLIC_SELL_PLANS` stays `0`. Do not turn it on. Turning it on does not create a charge, and it must not be used to add a digital checkout.

Physical QR stands and NFC cards are goods. Those stay on the existing in-app YouPI checkout. The app opens the server `checkoutUrl` and never creates the payment itself.

## Play Console

- Leave the app in a state with no in-app products and no subscriptions for ReviewQR plans.
- Do not add a Play Billing product for a digital plan.
- The store listing and the in-app screens must not tell people to buy a plan on the website.
- Physical stand orders use the website payment page that the server already opens. No Play product is required for those goods.
- When a plan changes on the website, the device picks it up from `/api/v1` without a Play Console change.
