import type { ExpoConfig } from "expo/config";
import { getThemePalette } from "../ui/tokens.ts";

export type AppVariant = "owner" | "admin";

export const ADMIN_PACKAGE = "com.qr24x7.admin";

export function resolveAppVariant(value: unknown): AppVariant {
  return value === "admin" ? "admin" : "owner";
}

export function redirectForVariant(variant: AppVariant, segments: readonly string[]) {
  const inAdmin = segments.includes("(admin)");
  if (variant === "admin" && !inAdmin) return "/(admin)" as const;
  if (variant === "owner" && inAdmin) return "/(app)" as const;
  return null;
}

export function applyAppVariant(base: ExpoConfig, variant: AppVariant): ExpoConfig {
  if (variant === "owner") return base;
  const palette = getThemePalette("ocean", "dark");

  const { associatedDomains: _associatedDomains, ...ios } = base.ios ?? {};
  const { intentFilters: _intentFilters, permissions: _permissions, adaptiveIcon, ...android } = base.android ?? {};
  const ownerOnlyPlugins = new Set([
    "expo-camera",
    "expo-image-picker",
    "react-native-android-widget/app.plugin",
    "react-native-nfc-manager"
  ]);
  type Plugin = NonNullable<ExpoConfig["plugins"]>[number];
  const plugins: NonNullable<ExpoConfig["plugins"]> = [];
  for (const plugin of base.plugins ?? []) {
    const name = typeof plugin === "string" ? plugin : Array.isArray(plugin) ? String(plugin[0] ?? "") : "";
    const options = Array.isArray(plugin) ? plugin[1] : undefined;
    if (ownerOnlyPlugins.has(name)) continue;
    if (name === "expo-splash-screen") {
      plugins.push([name, {
        ...(options && typeof options === "object" ? options : {}),
        backgroundColor: palette.bg,
        image: "./assets/admin-splash-mark.png",
        imageWidth: 180,
        resizeMode: "contain",
        dark: { backgroundColor: palette.bg, image: "./assets/admin-splash-mark.png" },
        android: {
          backgroundColor: palette.bg,
          image: "./assets/admin-splash-mark.png",
          imageWidth: 180,
          resizeMode: "contain",
          dark: { backgroundColor: palette.bg, image: "./assets/admin-splash-mark.png" }
        }
      }] as Plugin);
    } else if (name === "expo-notifications") {
      plugins.push([name, { ...(options && typeof options === "object" ? options : {}), color: palette.primary }] as Plugin);
    } else {
      plugins.push(plugin as Plugin);
    }
  }
  if (!plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === "expo-local-authentication")) {
    plugins.push(["expo-local-authentication", { faceIDPermission: "Use Face ID to unlock QR24x7 Admin." }]);
  }

  return ({
    ...base,
    name: "QR24x7 Admin",
    scheme: "qr24x7admin",
    icon: "./assets/admin-icon.png",
    splash: { image: "./assets/admin-splash-mark.png", resizeMode: "contain", backgroundColor: palette.bg },
    ios: { ...ios, bundleIdentifier: ADMIN_PACKAGE },
    android: {
      ...android,
      package: ADMIN_PACKAGE,
      versionCode: 1,
      permissions: ["android.permission.POST_NOTIFICATIONS"],
      adaptiveIcon: {
        ...adaptiveIcon,
        foregroundImage: "./assets/admin-adaptive-icon.png",
        backgroundColor: palette.bg
      }
    },
    plugins,
    extra: { ...base.extra, appVariant: "admin" }
  } as unknown) as ExpoConfig;
}
