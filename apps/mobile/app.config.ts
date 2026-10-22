import type { ConfigContext, ExpoConfig } from "expo/config";

const packageName = "com.qr24x7.app";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "QR24x7",
  slug: "reviewqr",
  scheme: ["qr24x7", "reviewqr"],
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: false,
    bundleIdentifier: packageName
  },
  android: {
    package: packageName,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundImage: "./assets/adaptive-icon-background.png",
      backgroundColor: "#070B12"
    },
    permissions: [
      "android.permission.CAMERA",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.NFC"
    ]
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
        backgroundColor: "#070B12",
        image: "./assets/splash.png",
        imageWidth: 200
      }
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 36,
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
        color: "#35C8F0",
        icon: "./assets/notification-icon.png"
      }
    ],
    "expo-sharing",
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
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || ""
    }
  }
});
