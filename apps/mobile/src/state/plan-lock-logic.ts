export function isModuleList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Missing, malformed, or failed entitlement data is unknown, so it cannot lock a feature. */
export function isFeatureLockedByModules(modules: unknown, moduleId: string, isError = false) {
  if (isError || !isModuleList(modules)) return false;
  return !modules.includes(moduleId);
}
