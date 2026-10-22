# ReviewQR Android

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

On an Android phone with USB debugging:

```
npx expo start --dev-client
```

Build the dev client once (Android Studio and a device or emulator):

```
npx expo run:android
```

Cloud builds are documented in `docs/play-store.md`. Do not put private keys in `.env`. Only `EXPO_PUBLIC_` values belong here, and they are bundled into the app.
