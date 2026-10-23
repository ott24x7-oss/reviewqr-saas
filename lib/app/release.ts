export type AppReleaseConfig = {
  minVersionCode: number;
  latestVersionCode: number;
};

function whole(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function normalizeAppRelease(value: Partial<AppReleaseConfig> | null | undefined): AppReleaseConfig {
  return {
    minVersionCode: whole(value?.minVersionCode),
    latestVersionCode: whole(value?.latestVersionCode)
  };
}

export type UpdateMode = "none" | "flexible" | "immediate";

/** Below the admin minimum is an immediate Play update. Anything newer on Play is flexible. */
export function updateMode(current: number, config: AppReleaseConfig, playUpdateAvailable: boolean): UpdateMode {
  const version = whole(current);
  if (config.minVersionCode > 0 && version < config.minVersionCode) return "immediate";
  const behindLatest = config.latestVersionCode > 0 && version < config.latestVersionCode;
  if (behindLatest || playUpdateAvailable) return "flexible";
  return "none";
}
