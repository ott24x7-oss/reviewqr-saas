import type { ModuleId } from "../plans/catalog";
import { synthesizeLinks, resolveLinks, type TapBusinessFields } from "./links";
import { destinationFor } from "./direct-http";
import type { StoredLink } from "./presets";

export type DirectChoiceLink = {
  key: string;
  type: string;
  href: string;
  labelEn: string;
  labelHi: string;
  enabled: boolean;
};

export type DirectDecision =
  | { action: "page" }
  | { action: "redirect"; href: string; targetType: string };

function deviceChoice(mode: string) {
  if (mode === "DIRECT" || mode === "TAP_PAGE") return mode;
  return "INHERIT";
}

function moduleAllows(type: string, modules: readonly string[]) {
  const has = (id: ModuleId) => modules.includes(id);
  if (type === "menu") return has("MENU") || has("STORE");
  if (type === "whatsapp_order") return has("STORE");
  if (type === "google" || type === "trustpilot") return has("REVIEWS");
  return true;
}

/**
 * Device override wins, then the business setting, then the normal tap page.
 * A missing, disabled, or unsafe target stays on the page. Rating gating is not applied:
 * a direct Google button opens for every customer.
 */
export function resolveDirect(input: {
  pagePreview: boolean;
  limited: boolean;
  deviceMode: string;
  deviceTarget: string;
  businessMode: string;
  businessTarget: string;
  links: DirectChoiceLink[];
  modules: readonly string[];
  ownHosts: string[];
}): DirectDecision {
  if (input.pagePreview || input.limited) return { action: "page" };
  const device = deviceChoice(input.deviceMode);
  const mode = device === "INHERIT" ? (input.businessMode === "DIRECT" ? "DIRECT" : "TAP_PAGE") : device;
  if (mode !== "DIRECT") return { action: "page" };
  const target = device === "DIRECT" ? input.deviceTarget : input.businessTarget;
  const link = input.links.find((item) => item.key === target && item.enabled !== false);
  if (!link) return { action: "page" };
  if (!moduleAllows(link.type, input.modules)) return { action: "page" };
  const href = destinationFor(link.href, input.ownHosts);
  if (!href) return { action: "page" };
  return { action: "redirect", href, targetType: link.type };
}

function hasPublishedLinks(published: unknown) {
  return !!published && typeof published === "object" && !Array.isArray(published) && Array.isArray((published as { links?: unknown }).links);
}

/** Buttons a scan is allowed to open. Published buttons stay as the owner left them, including Google while gating is on. */
export function linksForDirect(fields: TapBusinessFields, channel: "q" | "t", code: string, now = new Date()): DirectChoiceLink[] {
  const source = hasPublishedLinks(fields.published) ? fields.published : null;
  const fallback = synthesizeLinks({ ...fields, reviewGating: false, channel, code });
  const links = resolveLinks(source, fallback, channel, code, now, fields.slug);
  const out: DirectChoiceLink[] = [];
  for (const link of links) {
    if (!link.href) continue;
    out.push({
      key: link.key,
      type: link.type,
      href: link.href,
      labelEn: link.labelEn,
      labelHi: link.labelHi,
      enabled: true
    });
  }
  return out;
}

/** Same rules as the public button, so the dropdown cannot offer a URL the scan would reject. */
export function storedDestination(
  link: { type: string; url: string; enabled: boolean },
  channel: "q" | "t",
  code: string,
  ownHosts: string[] = []
) {
  if (link.enabled === false) return null;
  const type = link.type;
  if (type === "feedback" || type === "wifi" || type === "call" || type === "upi") return null;
  if (type === "vcard") return code ? destinationFor(`/${channel}/${code}/contact`, ownHosts) : null;
  const url = link.url.trim();
  if ((type === "menu" || type === "whatsapp_order") && !url) {
    return destinationFor(`/${channel}/${code}/menu`, ownHosts);
  }
  if (!url) return null;
  return destinationFor(url, ownHosts);
}

export function storedDirectOptions(links: StoredLink[], channel: "q" | "t", code: string) {
  const options: DirectChoiceLink[] = [];
  for (const link of links) {
    const href = storedDestination(link, channel, code);
    if (!href) continue;
    options.push({
      key: link.key,
      type: link.type,
      href,
      labelEn: link.labelEn,
      labelHi: link.labelHi || link.labelEn,
      enabled: true
    });
  }
  return options;
}

export function describeOpen(input: {
  pagePreview?: boolean;
  limited: boolean;
  deviceMode: string;
  deviceTarget: string;
  businessMode: string;
  businessTarget: string;
  links: DirectChoiceLink[];
  modules: readonly string[];
}) {
  const decision = resolveDirect({ ...input, pagePreview: input.pagePreview === true, ownHosts: [] });
  if (decision.action === "page") return { labelEn: "Tap page", labelHi: "टैप पेज" };
  const link = input.links.find((item) => item.type === decision.targetType && item.href === decision.href)
    || input.links.find((item) => item.type === decision.targetType);
  return {
    labelEn: link?.labelEn || "Tap page",
    labelHi: link?.labelHi || "टैप पेज"
  };
}

export const directCopy = {
  en: {
    toggle: "Open one link directly (skip page)",
    target: "Direct link",
    opens: (label: string) => `Scanning your QR will open: ${label}`,
    hint: "Only one button is on. Turn on Direct link so a scan opens it.",
    inherit: "Inherit from business",
    tapPage: "Tap page",
    badge: (label: string) => `Opens: ${label}`,
    english: "English",
    hindi: "हिंदी"
  },
  hi: {
    toggle: "सीधा एक लिंक खोलें (पेज छोड़ें)",
    target: "डायरेक्ट लिंक",
    opens: (label: string) => `QR स्कैन करने पर खुलेगा: ${label}`,
    hint: "सिर्फ एक बटन चालू है। डायरेक्ट लिंक चालू करें, स्कैन उसी को खोलेगा।",
    inherit: "बिज़नेस से लें",
    tapPage: "टैप पेज",
    badge: (label: string) => `खुलेगा: ${label}`,
    english: "English",
    hindi: "हिंदी"
  }
} as const;
