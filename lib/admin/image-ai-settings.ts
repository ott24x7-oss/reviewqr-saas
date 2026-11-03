import { maskSecret } from "../admin";
import { getImageAiConfig } from "../settings";

export async function loadAdminImageAiSettings() {
  const config = await getImageAiConfig();
  return { ...config, apiKey: maskSecret(config.apiKey) };
}
