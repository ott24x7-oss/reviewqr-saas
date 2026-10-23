# Play Store readiness

The Android application id in `apps/mobile/app.config.ts` is `com.qr24x7.app`. The app name is QR24x7. Deep links use `qr24x7://`, and `reviewqr://` still opens the same screens. Changing the application id later means a new Play listing. The Expo project slug stays `reviewqr` so an existing EAS project id keeps working.

`versionCode` is `1`. `compileSdkVersion` and `targetSdkVersion` are `36` (Android 16). From 31 August 2026, new apps and updates must target API 36. `minSdkVersion` is `24`. The splash image is the `expo-splash-screen` plugin. Icons are in `apps/mobile/assets`.

Digital plans are not sold in the app. See [play-billing.md](play-billing.md). Physical QR stands and NFC cards still check out through the server.

## Commands

Run these from `apps/mobile` after `npx eas login`. Do not commit a cloud build from this repository. Set `EXPO_PUBLIC_EAS_PROJECT_ID` in `apps/mobile/.env` to the project id EAS prints. Push registration stays quiet until that value is set.

```
npx eas build --profile development --platform android
npx eas build --profile preview --platform android
npx eas build --profile production --platform android
```

`development` is a dev-client APK. `preview` is an installable APK for testers. `production` is an AAB for Play Console. Submit is a separate step:

```
npx eas submit --profile production --platform android
```

## Privacy and deletion

Use the origin in `NEXT_PUBLIC_APP_URL` for the website, and the same origin in `EXPO_PUBLIC_API_URL` for the app. Do not hardcode a host.

- Privacy policy: `{NEXT_PUBLIC_APP_URL}/privacy`
- Account deletion: `{NEXT_PUBLIC_APP_URL}/account/delete`
- The same deletion is in the app under More → Delete account. It calls `POST /api/v1/me/deletion` (`request`, then `confirm` with the 6-digit code). The account row is anonymized. Payment rows and GST invoices stay. `DELETE /api/v1/me` with `{ "confirm": "DELETE" }` still works.

## Data safety

Answer the form from what the app actually does. Traffic uses HTTPS.

| Data | Why | Shared |
| --- | --- | --- |
| Name, email, phone | Account, WhatsApp OTP, delivery address for a physical stand | No. Not sold. |
| Business name, address, Google review link | Tap page and dashboard | No |
| Product photo | Optional. Sent to our server so it can suggest a name and price | Processed by our API. Not sold. |
| Orders, feedback messages | The owner inbox | No |
| Expo push token | New order, new feedback, shipping update, plan expiry | Sent to Expo's push service to deliver the notification |
| NFC tag contents | The tap URL the owner asks to write. The tag stays on their stand | No |

Users can request deletion in the app and at `/account/delete`. Data is encrypted in transit. The app does not collect precise location.

## Permissions

- Camera: photograph a product so the server can suggest a name and price. The owner can add a product without a photo.
- Notifications: new order, new feedback, shipping update, and plan expiry. The owner can turn them off in More.
- NFC: write the tap-page URL onto a stand, read it back, and optionally lock the tag. Shown to owners and field roles. A phone without NFC sees a plain message.

## Crash reports

The app uses `@sentry/react-native`. It starts only when `EXPO_PUBLIC_SENTRY_DSN` is set. An empty value sends nothing. Events do not include the user block. Phone numbers, email addresses, and tokens are stripped before send. `release` is `com.qr24x7.app@<version>+<versionCode>` and `dist` is the `versionCode`.

Source maps upload on EAS Build. The Expo plugin is `@sentry/react-native/expo` in `apps/mobile/app.config.ts`. Set these EAS secrets for the upload: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`. Do not put the auth token in the app config.

`apps/mobile/package.json` runs `node ./scripts/upload-sentry-sourcemaps.mjs` as `eas-build-on-success`. The script does nothing when the DSN is unset. When the token, org, and project are set and a `dist` folder exists, it runs `sentry-expo-upload-sourcemaps`. During the native build the Expo plugin also uploads maps when those secrets are present. Do not run an EAS build from this repository unless you mean to.

## Closed testing

Google asks a personal Play Console account to run a closed test before production.

1. Create the app with application id `com.qr24x7.app`.
2. Fill the store listing, the privacy policy URL, Data safety, the content rating, and the target audience.
3. Upload the production AAB to the Closed testing track.
4. Create an email list of at least 12 testers and send them the opt-in link.
5. Each tester opts in and installs the app. Google counts 12 testers who stay opted in for 14 days in a row.
6. After that window, apply for production access from the Play Console dashboard. Do not turn on in-app plan sales until the billing note in `docs/play-billing.md` is decided.
