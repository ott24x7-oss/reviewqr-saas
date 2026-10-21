/**
 * AI helper for review assistance. Talks to any OpenAI-compatible
 * chat-completions endpoint (OpenAI, OpenRouter, Groq, Together, local, …)
 * configured by the admin in Admin → AI.
 *
 * polishReviewDraft() cleans up words the customer already wrote.
 * draftOwnerReplies() suggests replies the owner copies. Nothing is posted.
 * generateMenuFromPhoto() reads a menu photo.
 *
 * All functions THROW on failure. Callers keep the customer's own text.
 */
import type { AiConfig } from "./settings";
import { assertSafeOutboundUrl } from "./ssrf";
import { consumeAiCall } from "./entitlements";
import { parseMenuDraft, type MenuDraftItem } from "./tap/menu-draft";
import { readItemCopy, type ItemCopyField } from "./store/item-copy";
import { readProductDraft, type ProductDraft } from "./store/entry";

export type BusinessContext = {
  name: string;
  industry?: string | null;
  description?: string | null;
  services?: string | null;
  city?: string | null;
  website?: string | null;
};

function contextBlock(ctx: BusinessContext): string {
  const lines = [
    `Business name: ${ctx.name}`,
    ctx.industry ? `Industry / category: ${ctx.industry}` : "",
    ctx.city ? `City: ${ctx.city}` : "",
    ctx.description ? `About: ${ctx.description}` : "",
    ctx.services ? `Services / offerings: ${ctx.services}` : "",
    ctx.website ? `Website: ${ctx.website}` : ""
  ].filter(Boolean);
  return lines.join("\n");
}

/** Low-level call. Returns the assistant message content string. */
type ChatContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

async function chat(
  cfg: AiConfig,
  messages: Array<{ role: "system" | "user"; content: ChatContent }>,
  opts: { maxTokens?: number; temperature?: number; businessId?: string } = {}
): Promise<string> {
  if (!cfg.enabled || !cfg.apiKey) throw new Error("AI not configured");
  if (opts.businessId) await consumeAiCall(opts.businessId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const url = await assertSafeOutboundUrl(`${cfg.apiUrl}/chat/completions`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens ?? 700,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Empty AI response");
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

/** List available model ids from an OpenAI-compatible `/models` endpoint. */
export async function listModels(cfg: AiConfig): Promise<string[]> {
  if (!cfg.apiKey) throw new Error("Add an API key first");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const url = await assertSafeOutboundUrl(`${cfg.apiUrl}/models`);
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${cfg.apiKey}` },
      signal: controller.signal
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Models request failed (${res.status}): ${text.slice(0, 160)}`);
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Unexpected models response");
    }
    const arr: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    const ids: string[] = [];
    for (const m of arr) {
      const id = typeof m === "string" ? m : m?.id;
      if (typeof id === "string" && id.length > 0) ids.push(id);
    }
    return Array.from(new Set(ids)).sort();
  } finally {
    clearTimeout(timeout);
  }
}

/** Ping the chat endpoint to confirm the URL + key + model actually work. */
export async function testConnection(cfg: AiConfig): Promise<string> {
  if (!cfg.apiKey) throw new Error("Add an API key first");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const url = await assertSafeOutboundUrl(`${cfg.apiUrl}/chat/completions`);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        max_tokens: 5,
        temperature: 0
      }),
      signal: controller.signal
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`(${res.status}) ${text.slice(0, 180)}`);
    let reply = "";
    try {
      reply = JSON.parse(text)?.choices?.[0]?.message?.content ?? "";
    } catch {}
    return (reply || "OK").trim();
  } finally {
    clearTimeout(timeout);
  }
}

/** Pull a JSON object/array out of a model response, tolerating stray prose. */
function parseJson(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    throw new Error("Could not parse AI JSON");
  }
}

/** Light cleanup of a draft the customer already wrote. Does not post anything. */
export async function polishReviewDraft(
  cfg: AiConfig,
  ctx: BusinessContext,
  draft: string,
  businessId?: string
): Promise<string> {
  const system =
    "You clean up a review the customer already wrote. Keep their meaning, facts, and voice. " +
    "Do not add praise, places, staff names, or details they did not write. " +
    "Do not mention a reward, coupon, or star rating. No emojis, hashtags, or markdown. Return ONLY JSON.";
  const user =
    `${contextBlock(ctx)}\n\n` +
    `The customer's own words:\n"""${draft.slice(0, 2000)}"""\n\n` +
    'Return a lightly edited version as JSON: {"suggestion":"..."}';

  const raw = await chat(
    cfg,
    [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    { maxTokens: 350, temperature: 0.3, businessId }
  );
  const data = parseJson(raw);
  const suggestion = String(data?.suggestion || data?.text || "").trim();
  if (suggestion.length < 5) throw new Error("No usable suggestion");
  return suggestion;
}

/** Two drafts the owner edits and copies. The public one must not quote the private note. */
export async function draftOwnerReplies(
  cfg: AiConfig,
  ctx: BusinessContext,
  input: { rating: number; message: string; tags: string[] },
  businessId?: string
): Promise<{ publicReply: string; whatsappReply: string }> {
  const system =
    "You draft two replies for a business owner. Return ONLY JSON. " +
    "publicReply may be pasted on Google. It must not quote, paraphrase, or repeat the private note, " +
    "the customer's name, phone, or email, and it must not mention a reward, coupon, or star rating. " +
    "whatsappReply is a private message. It may respond to the note. It must not include a phone number " +
    "or offer a reward for a public review. No emojis, hashtags, or markdown.";
  const user =
    `${contextBlock(ctx)}\n\n` +
    `Star rating (context only, do not mention it): ${input.rating}\n` +
    `Topics: ${input.tags.join(", ") || "none"}\n` +
    `Private note, for the WhatsApp reply only:\n"""${input.message.slice(0, 1500)}"""\n\n` +
    'Return JSON: {"publicReply":"...","whatsappReply":"..."}';
  const raw = await chat(
    cfg,
    [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    { maxTokens: 400, temperature: 0.3, businessId }
  );
  const data = parseJson(raw);
  const publicReply = String(data?.publicReply || "").trim();
  const whatsappReply = String(data?.whatsappReply || "").trim();
  if (publicReply.length < 5 || whatsappReply.length < 5) throw new Error("No usable reply");
  return { publicReply, whatsappReply };
}

/** One short description or Hindi name. Throws on failure. Does not save the item. */
export async function suggestItemCopy(
  cfg: AiConfig,
  ctx: BusinessContext,
  input: { field: ItemCopyField; name: string; nameHi?: string },
  businessId: string
): Promise<string> {
  const name = input.name.trim().slice(0, 80);
  if (name.length < 1) throw new Error("Name the item");
  const description =
    input.field === "description"
      ? "You write one short menu line for a shop in India. One sentence, plain text, under 160 characters. Do not invent a price, a phone number, an offer, or a reward. Return ONLY JSON."
      : "You write the Hindi name of one menu item in Devanagari. Return only that name. Do not add a price, English, or a reward. Return ONLY JSON.";
  const ask =
    input.field === "description"
      ? `${contextBlock(ctx)}\n\nItem: ${name}\n${input.nameHi?.trim() ? `Hindi name: ${input.nameHi.trim().slice(0, 80)}\n` : ""}Return JSON: {"description":"..."}`
      : `${contextBlock(ctx)}\n\nItem: ${name}\nReturn JSON: {"nameHi":"..."}`;
  const raw = await chat(
    cfg,
    [
      { role: "system", content: description },
      { role: "user", content: ask }
    ],
    { maxTokens: 180, temperature: 0.3, businessId }
  );
  return readItemCopy(raw, input.field);
}

/** Reads a menu photo. Throws when AI is not configured. Does not save items. */
export async function generateMenuFromPhoto(
  cfg: AiConfig,
  imageDataUrl: string,
  businessId: string
): Promise<MenuDraftItem[]> {
  if (!/^data:image\/(?:png|jpeg|jpg|webp);base64,[a-z0-9+/=\s]+$/i.test(imageDataUrl)) {
    throw new Error("Use a JPEG or PNG photo");
  }
  if (imageDataUrl.length > 2_000_000) throw new Error("That photo is too large");
  const raw = await chat(
    cfg,
    [
      {
        role: "system",
        content: "You read a café or restaurant menu photo. Return only JSON. Do not invent dishes that are not visible."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              'List the visible dishes, at most 50. Respond as JSON: {"items":[{"name":"Filter coffee","priceRupees":80,"veg":"VEG"}]}. ' +
              "veg is VEG, NON_VEG, EGG, or NONE. Use 0 when a price is not printed. Do not invent a price. Skip section headings."
          },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ],
    { maxTokens: 2200, temperature: 0.2, businessId }
  );
  return parseMenuDraft(raw);
}

const imagePattern = /^data:image\/(?:png|jpeg|jpg|webp);base64,[a-z0-9+/=\s]+$/i;

/** One product in a photo. The reply's price is discarded. Does not save. */
export async function readProductPhoto(
  cfg: AiConfig,
  imageDataUrl: string,
  businessId: string
): Promise<ProductDraft> {
  if (!imagePattern.test(imageDataUrl)) throw new Error("Use a JPEG or PNG photo");
  if (imageDataUrl.length > 2_000_000) throw new Error("That photo is too large");
  const raw = await chat(
    cfg,
    [
      {
        role: "system",
        content:
          "You name one product in a photo for a shop in India. Return only JSON. Do not invent a price, a phone number, an offer, or a reward. If you are unsure, leave the field empty."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              'Respond as JSON: {"name":"","category":"","description":"","veg":"NONE","brand":"","colour":"","durationMinutes":null}. ' +
              "veg is VEG, NON_VEG, EGG, or NONE. Do not include a price. description is one short sentence."
          },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ],
    { maxTokens: 300, temperature: 0.2, businessId }
  );
  const draft = readProductDraft(raw);
  if (!draft) throw new Error("No usable text");
  return draft;
}

/** Turns messy notes into priced rows. Lines with no written price are dropped. Does not save. */
export async function cleanPastedItems(cfg: AiConfig, text: string, businessId: string): Promise<MenuDraftItem[]> {
  const notes = text.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 4000);
  if (notes.length < 3) throw new Error("Paste the items first");
  const raw = await chat(
    cfg,
    [
      {
        role: "system",
        content:
          "You turn an owner's notes into a product list. Return only JSON. Do not invent a price. Skip any line that has no price written. Do not add a phone number, an offer, or a reward."
      },
      {
        role: "user",
        content: `${notes}\n\nRespond as JSON: {"items":[{"name":"Cappuccino","priceRupees":120,"veg":"NONE"}]}. At most 50 items.`
      }
    ],
    { maxTokens: 2200, temperature: 0.1, businessId }
  );
  return parseMenuDraft(raw).filter((item) => item.priceRupees > 0);
}
