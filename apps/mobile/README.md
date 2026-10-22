# QR24x7 Android

The web app stays at the repository root. This folder is a separate Expo app. It is not an npm workspace, so `npm ci` on Railway does not install it.

## Run it locally

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_URL` to the origin of the running web app, with no trailing slash. A phone cannot use `localhost` for your computer. Use the computer's LAN address, for example `http://192.168.1.20:3000`.
3. Start the web app from the repository root (`npm run dev`).
4. From this folder:

```
npm install
npx expo start
```

OTP, the dashboard, and the shop work against that API. The camera, push notifications, and NFC writer need a development build. Expo Go does not include `react-native-nfc-manager`.

Push registration also needs `EXPO_PUBLIC_EAS_PROJECT_ID`. Leave it empty until `npx eas login` has created the project. The app stays quiet without it.

Account deletion is under More in the app, and on the web at `/account/delete`.

On an Android phone with USB debugging:

```
npx expo start --dev-client
```

Build the dev client once (Android Studio and a device or emulator):

```
npx expo run:android
```

Cloud builds are documented in [docs/play-store.md](../../docs/play-store.md). From this folder, after `npx eas login`:

```
npx eas build --profile development --platform android
npx eas build --profile preview --platform android
npx eas build --profile production --platform android
```

`development` and `preview` produce an APK. `production` produces an AAB. Do not put private keys in `.env`. Only `EXPO_PUBLIC_` values belong here, and they are bundled into the app. The application id is `com.qr24x7.app`. Set `EXPO_PUBLIC_API_URL` to the same origin as `NEXT_PUBLIC_APP_URL`. Privacy is that origin plus `/privacy`. Account deletion is that origin plus `/account/delete`.
