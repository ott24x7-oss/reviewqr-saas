/**
 * WhatsApp helper.
 *
 * Three send paths picked at runtime via WhatsAppConfig.provider:
 *   1. click-to-chat — generates a wa.me URL the caller (or staff) opens
 *      manually. No auth, no setup. Fine for low-volume / human-in-loop.
 *   2. cloud-api — Meta WhatsApp Cloud API. Requires Business approval +
 *      verified number. Best for high volume + deliverability.
 *   3. baileys — unofficial WhatsApp Web. Free, fast to set up (scan a
 *      QR with your phone), but only suitable for low-volume notifications
 *      and you must follow WhatsApp ToS to avoid bans.
 */
import { normalizePhone } from "./utils";
import { getWhatsAppConfig } from "./settings";

export type WhatsAppPayload = {
  to: string;
  message: string;
  templateName?: string;
};

export function buildClickToChatUrl(phone: string, message: string) {
  const normalized = normalizePhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export async function isCloudApiConfigured() {
  const cfg = await getWhatsAppConfig();
  return !!(cfg.apiToken && cfg.phoneId);
}

export async function sendWhatsAppCloud(payload: WhatsAppPayload) {
  const cfg = await getWhatsAppConfig();
  if (!cfg.apiToken || !cfg.phoneId) {
    throw new Error("WhatsApp Cloud API not configured.");
  }
  const to = normalizePhone(payload.to);
  const res = await fetch(`${cfg.apiUrl}/${cfg.phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: payload.message, preview_url: false }
    })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WhatsApp API ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return { ok: true as const, messageId: json.messages?.[0]?.id, via: "cloud" as const };
}

async function sendWhatsAppBaileys(payload: WhatsAppPayload) {
  const { getBaileys } = await import("./whatsapp-baileys");
  const mgr = getBaileys();
  if (!mgr.isConnected()) {
    throw new Error("Baileys not connected — open Admin → WhatsApp to pair.");
  }
  await mgr.send(payload.to, payload.message);
  return { ok: true as const, via: "baileys" as const };
}

/**
 * Smart send. Honours the configured provider; on hard-failure of an
 * automated provider, falls back to returning a click-to-chat URL so the
 * caller still has a way to deliver the message manually.
 */
export async function sendWhatsApp(payload: WhatsAppPayload) {
  const cfg = await getWhatsAppConfig();

  if (cfg.provider === "cloud-api") {
    try {
      return await sendWhatsAppCloud(payload);
    } catch (e: any) {
      console.warn("[wa] cloud send failed, falling back to wa.me:", e.message);
    }
  } else if (cfg.provider === "baileys") {
    try {
      return await sendWhatsAppBaileys(payload);
    } catch (e: any) {
      console.warn("[wa] baileys send failed, falling back to wa.me:", e.message);
    }
  }

  return {
    ok: true as const,
    via: "click-to-chat" as const,
    url: buildClickToChatUrl(payload.to, payload.message)
  };
}

/* ============== Templates ============== */

export type TemplateVars = Record<string, string | number | undefined | null>;

export function renderTemplate(template: string, vars: TemplateVars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

export const DEFAULT_TEMPLATES = {
  reviewRequest: `Hi {{customerName}}! 🙏\n\nThank you for visiting *{{businessName}}*. We hope you had a great experience!\n\nCould you please share your feedback in 30 seconds?\n👉 {{reviewUrl}}\n\nYour review means the world to a small business like ours. Thank you! ❤️`,

  thankYou: `Thank you for the wonderful review, {{customerName}}! 🌟\n\nWe really appreciate you taking the time to share your experience with *{{businessName}}*.\n\nWe look forward to seeing you again soon!`,

  followUp: `Hi {{customerName}},\n\nWe noticed you haven't shared your experience with *{{businessName}}* yet. Would you take a moment?\n\n👉 {{reviewUrl}}\n\nIt only takes 30 seconds and helps us a lot. Thanks!`,

  apology: `Hi {{customerName}},\n\nWe're really sorry your experience at *{{businessName}}* wasn't up to the mark. Your feedback is being reviewed by our team and we'd love to make it right.\n\nCould we call you on {{customerPhone}} to discuss?\n\nThank you for your patience.`,

  bill: `Hi! 👋\n\nThank you for choosing *{{businessName}}*.\n\nLoved your experience? It would mean a lot if you'd leave a quick Google review:\n👉 {{reviewUrl}}\n\nThank you! ⭐`
} as const;

export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;
