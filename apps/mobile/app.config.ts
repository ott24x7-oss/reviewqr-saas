import type { ConfigContext, ExpoConfig } from "expo/config";

const packageName = "com.qr24x7.app";
// Expo project @ott24x7/reviewqr. Not a secret.
const easProjectId = "00c6693d-9ab5-4dce-9de6-e24889f469fa";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "QR24x7",
  slug: "reviewqr",
  owner: "ott24x7",
  scheme: ["qr24x7", "reviewqr"],
  primaryColor: "#16A34A",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: false,
    bundleIdentifier: packageName
  },
  android: {
    package: packageName,
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundImage: "./assets/adaptive-icon-background.png",
      monochromeImage: "./assets/adaptive-icon-monochrome.png",
      backgroundColor: "#16A34A"
    },
    permissions: [
      "android.permission.CAMERA",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.NFC"
    ],
    // Added by plugins but never used: no audio recording, no overlay windows.
    blockedPermissions: ["android.permission.RECORD_AUDIO", "android.permission.SYSTEM_ALERT_WINDOW"]
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    "expo-status-bar",
    "expo-font",
    "expo-image",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#16A34A",
        image: "./assets/splash-mark.png",
        imageWidth: 120,
        resizeMode: "contain",
        dark: {
          backgroundColor: "#16A34A",
          image: "./assets/splash-mark.png"
        },
        // Android 12+ windowSplashScreenBackground and windowSplashScreenAnimatedIcon.
        android: {
          backgroundColor: "#16A34A",
          image: "./assets/splash-mark.png",
          imageWidth: 120,
          resizeMode: "contain",
          dark: {
            backgroundColor: "#16A34A",
            image: "./assets/splash-mark.png"
          }
        }
      }
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 37,
          targetSdkVersion: 36,
          minSdkVersion: 24
        }
      }
    ],
    [
      "expo-camera",
      {
        cameraPermission: "QR24x7 uses the camera to photograph a product so we can suggest a name and price.",
        recordAudioAndroid: false
      }
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "QR24x7 uses a photo you pick to suggest a product name and price."
      }
    ],
    [
      "expo-notifications",
      {
        color: "#16A34A",
        icon: "./assets/notification-icon.png"
      }
    ],
    "expo-sharing",
    "expo-audio",
    [
      "react-native-android-widget/app.plugin",
      {
        widgets: [
          {
            name: "QR24x7Today",
            label: "QR24x7 Today",
            description: "Today's scans, orders and reviews",
            minWidth: "110dp",
            minHeight: "110dp",
            targetCellWidth: 2,
            targetCellHeight: 2,
            maxResizeWidth: "250dp",
            maxResizeHeight: "110dp",
            resizeMode: "horizontal",
            updatePeriodMillis: 1800000,
            previewImage: "./assets/icon.png"
          },
          {
            name: "MyQr",
            label: "My QR",
            description: "Open your QR",
            minWidth: "40dp",
            minHeight: "40dp",
            targetCellWidth: 1,
            targetCellHeight: 1,
            resizeMode: "none",
            updatePeriodMillis: 1800000,
            previewImage: "./assets/icon.png"
          }
        ]
      }
    ],
    [
      "react-native-nfc-manager",
      {
        nfcPermission: "QR24x7 writes your tap-page link onto an NFC stand."
      }
    ]
  ],
  experiments: {
    typedRoutes: false
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || easProjectId
    }
  }
});
