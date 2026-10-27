export type CloudTemplate = { name: string; language: string; status: string };
export type CloudTemplateStatus = { configured: boolean; templates: CloudTemplate[] };

type CloudConfig = { apiUrl: string; apiToken: string; phoneId: string };

function languageOf(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "code" in value && typeof value.code === "string") return value.code;
  return "";
}

/**
 * Meta message templates, only when a Cloud API token and phone id are set.
 * A failed lookup stays configured with an empty list. The token is never returned.
 */
export async function cloudTemplateStatus(cfg: CloudConfig, fetchImpl: typeof fetch = fetch): Promise<CloudTemplateStatus> {
  if (!cfg.apiToken || !cfg.phoneId) return { configured: false, templates: [] };
  const base = (cfg.apiUrl || "https://graph.facebook.com/v20.0").replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${cfg.apiToken}` };
  try {
    const phoneRes = await fetchImpl(`${base}/${cfg.phoneId}?fields=whatsapp_business_account`, {
      headers,
      signal: AbortSignal.timeout(4000)
    });
    const phoneJson = (await phoneRes.json().catch(() => ({}))) as { whatsapp_business_account?: { id?: unknown } };
    const waba = phoneJson.whatsapp_business_account?.id;
    if (!phoneRes.ok || typeof waba !== "string" || !waba) return { configured: true, templates: [] };
    const listRes = await fetchImpl(`${base}/${waba}/message_templates?fields=name,language,status&limit=50`, {
      headers,
      signal: AbortSignal.timeout(4000)
    });
    const listJson = (await listRes.json().catch(() => ({}))) as { data?: unknown };
    if (!listRes.ok || !Array.isArray(listJson.data)) return { configured: true, templates: [] };
    const templates = listJson.data.slice(0, 50).flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const item = row as { name?: unknown; language?: unknown; status?: unknown };
      const name = typeof item.name === "string" ? item.name : "";
      if (!name) return [];
      return [{ name, language: languageOf(item.language), status: typeof item.status === "string" ? item.status : "" }];
    });
    return { configured: true, templates };
  } catch {
    return { configured: true, templates: [] };
  }
}
