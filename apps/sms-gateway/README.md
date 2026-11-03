# QR24x7 SMS Gateway for Android

This Java Android app pairs a phone with QR24x7 and forwards received SMS messages to its SMS observer while polling for messages to send. It is a separate install from the existing gateway app, so both can run on the same phone and each can be paired with its own server credentials. The pairing JSON and API protocol remain compatible with the QR24x7 server.

## Requirements

- JDK 17
- Android SDK Platform 35 and Build Tools
- A QR24x7 admin account with access to SMS gateway pairing

The project uses Android Gradle Plugin 8.9.1 and the included Gradle 8.13 wrapper.

## Release signing

Create `apps/sms-gateway/keystore.properties` from `keystore.properties.example` and fill in `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`. Put the keystore file at the path given by `storeFile` (relative paths are resolved from `apps/sms-gateway/`). These files are ignored by Git. Release builds fail with a clear error if the properties or keystore are missing. This project does not generate a keystore.

## Build

With JDK 17 installed and configured as `JAVA_HOME`, run from `apps/sms-gateway/`:

```powershell
.\gradlew.bat assembleRelease
```

The signed APK is written to `app/build/outputs/apk/release/app-release.apk`.

## Install and pair

Install this app alongside the existing SMS gateway app. In the QR24x7 admin panel, open **Admin → Payments → SMS gateway → Create pairing QR**. In this app, choose **Pair with QR** and scan the QR code (or paste its JSON). Pair each installed gateway app separately.

Android may pause background work to save battery. For reliable heartbeats and outbox polling, allow this app to run unrestricted or exclude it from battery optimization. Some phone brands also require enabling Autostart and locking the app in Recents; the app shows device-specific guidance.

## Permissions

- `INTERNET`: pair and exchange signed API requests over HTTPS.
- `CAMERA`: scan the pairing QR; manual QR JSON paste is also available.
- `RECEIVE_SMS`: forward received SMS to the observer endpoint.
- `SEND_SMS`: send outbox messages returned by the paired server.
- `READ_PHONE_STATE`: report SIM slots and select the server-assigned subscription.
- `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`, and `FOREGROUND_SERVICE_DATA_SYNC`: show and run the gateway service.
- `RECEIVE_BOOT_COMPLETED`: restart the service after boot when paired.
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`: open Android's battery exemption settings.

Plain HTTP is rejected except for `localhost` and `127.0.0.1` development URLs. The fallback SIM selector applies only when the server returns `sim_slot: "ask"`; a numbered server-selected slot is honored and reports `sim_missing` if unavailable. The phone reserves a maximum of 100 send attempts per India Standard Time calendar day. SMS contents are not written to app logs.
