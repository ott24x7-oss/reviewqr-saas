export type HideBrandingSource = "PURCHASE" | "PLAN" | "ADMIN" | null;

export function hideBusinessBranding(input: {
  enabled: boolean;
  source: HideBrandingSource;
  agencyPlan: boolean;
}) {
  if (input.source === "ADMIN" || input.source === "PLAN") return input.enabled;
  if (input.source === "PURCHASE") return true;
  return input.enabled || input.agencyPlan;
}

export function showPlatformBranding(hideBranding: boolean) {
  return !hideBranding;
}
