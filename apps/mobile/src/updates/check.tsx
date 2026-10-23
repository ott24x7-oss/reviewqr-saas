import Constants from "expo-constants";
import { useEffect } from "react";
import { Platform } from "react-native";
import { apiBaseUrl } from "../api/instance";
import { normalizeAppRelease, updateMode, type UpdateMode } from "./mode";

type PlayUpdater = {
  checkNeedsUpdate: () => Promise<{ shouldUpdate?: boolean }>;
  startUpdate: (options: { updateType: number }) => Promise<void>;
};

/** Asks Play for a flexible update, or an immediate one when this build is below the server minimum. */
export function AppUpdateCheck() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let cancelled = false;
    void runUpdateCheck(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

export async function runUpdateCheck(cancelled: () => boolean) {
  const current = Number(Constants.expoConfig?.android?.versionCode || 0);
  const config = await readReleaseConfig();
  let updater: PlayUpdater | null = null;
  let playUpdateAvailable = false;
  try {
    const mod = await import("sp-react-native-in-app-updates");
    const SpInAppUpdates = mod.default;
    const IAUUpdateKind = mod.IAUUpdateKind;
    updater = new SpInAppUpdates(false);
    const result = await updater.checkNeedsUpdate();
    playUpdateAvailable = Boolean(result.shouldUpdate);
    if (cancelled()) return;
    const mode = updateMode(current, config, playUpdateAvailable);
    if (mode === "none" || !playUpdateAvailable) return;
    await updater.startUpdate({ updateType: kindFor(mode, IAUUpdateKind) });
  } catch {
    return;
  }
}

function kindFor(mode: UpdateMode, kinds: { FLEXIBLE: number; IMMEDIATE: number }) {
  return mode === "immediate" ? kinds.IMMEDIATE : kinds.FLEXIBLE;
}

async function readReleaseConfig() {
  const base = apiBaseUrl();
  if (!base) return normalizeAppRelease(null);
  try {
    const res = await fetch(`${base}/api/v1/app/config`);
    if (!res.ok) return normalizeAppRelease(null);
    const json = (await res.json()) as { data?: { minVersionCode?: number; latestVersionCode?: number } };
    return normalizeAppRelease(json.data);
  } catch {
    return normalizeAppRelease(null);
  }
}
