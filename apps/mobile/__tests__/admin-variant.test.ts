import type { ExpoConfig } from "expo/config";
import { ADMIN_PACKAGE, applyAppVariant, redirectForVariant, resolveAppVariant } from "../src/admin/variant";

const base = {
  name: "QR24x7",
  scheme: ["qr24x7", "reviewqr"],
  ios: { bundleIdentifier: "com.qr24x7.app", associatedDomains: ["applinks:qr24x7.in"] },
  android: {
    package: "com.qr24x7.app",
    versionCode: 5,
    intentFilters: [{ action: "VIEW", data: [{ scheme: "https", host: "qr24x7.in" }] }],
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#16A34A" }
  },
  plugins: ["expo-router", "expo-camera", ["expo-splash-screen", { backgroundColor: "#16A34A" }]],
  extra: { owner: "ott24x7" }
} as unknown as ExpoConfig;

describe("admin app variant", () => {
  it("leaves the owner config unchanged", () => {
    expect(resolveAppVariant(undefined)).toBe("owner");
    expect(applyAppVariant(base, "owner")).toBe(base);
    expect(applyAppVariant(base, "owner").android?.package).toBe("com.qr24x7.app");
  });

  it("builds an isolated admin config without web app links", () => {
    const config = applyAppVariant(base, "admin");
    expect(config.name).toBe("QR24x7 Admin");
    expect(config.scheme).toBe("qr24x7admin");
    expect(config.android?.package).toBe(ADMIN_PACKAGE);
    expect(config.android?.versionCode).toBe(1);
    expect(config.android?.intentFilters).toBeUndefined();
    expect(config.ios?.associatedDomains).toBeUndefined();
    expect(config.icon).toBe("./assets/admin-icon.png");
    expect((config as ExpoConfig & { splash?: { image?: string } }).splash?.image).toBe("./assets/admin-splash-mark.png");
    expect(config.plugins).not.toContain("expo-camera");
  });

  it("redirects each variant away from the other variant routes", () => {
    expect(redirectForVariant("admin", ["(app)", "home"])).toBe("/(admin)");
    expect(redirectForVariant("admin", ["(admin)", "login"])).toBeNull();
    expect(redirectForVariant("owner", ["(admin)", "money"])).toBe("/(app)");
    expect(redirectForVariant("owner", ["(app)", "home"])).toBeNull();
    expect(resolveAppVariant("admin")).toBe("admin");
  });
});
