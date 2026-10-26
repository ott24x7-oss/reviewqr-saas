import { maskSecret } from "@/lib/admin";
import { getAiConfig, getEmailConfig, getWhatsAppConfig } from "@/lib/settings";

export function maskAdminConfig<T extends Record<string, unknown>>(config: T, keys: readonly (keyof T)[]) {
  const masked = { ...config };
  for (const key of keys) {
    const value = masked[key];
    if (typeof value === "string") masked[key] = maskSecret(value) as T[keyof T];
  }
  return masked;
}

export async function loadAdminWhatsAppSettings() {
  return maskAdminConfig(await getWhatsAppConfig(), ["apiToken"]);
}

export async function loadAdminEmailSettings() {
  return maskAdminConfig(await getEmailConfig(), ["smtpPass", "relaySecret"]);
}

export async function loadAdminAiSettings() {
  return maskAdminConfig(await getAiConfig(), ["apiKey"]);
}
