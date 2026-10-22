import type { ConfigContext, ExpoConfig } from "expo/config";

const packageName = "com.reviewqr.app";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ReviewQR",
  slug: "reviewqr",
  scheme: "reviewqr",
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
    "expo-font",
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
        cameraPermission: "ReviewQR uses the camera to photograph a product so we can suggest a name and price."
      }
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "ReviewQR uses a photo you pick to suggest a product name and price."
      }
    ],
    [
      "expo-notifications",
      {
        color: "#35C8F0"
      }
    ],
    "expo-sharing",
    [
      "react-native-nfc-manager",
      {
        nfcPermission: "ReviewQR writes your tap-page link onto an NFC stand."
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
