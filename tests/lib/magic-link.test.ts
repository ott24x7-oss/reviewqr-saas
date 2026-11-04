import { describe, expect, it } from "vitest";
import {
  createMagicLinkSecret,
  decideMagicLinkMessage,
  MAGIC_LINK_KEYWORD,
  SIGNUP_MAGIC_LINK_KEYWORD,
  magicLinkRateLimitAllowed,
  magicLinkUsable,
  normalizeMagicLinkText,
  phoneFromWhatsAppJid
} from "../../lib/auth/magic-link";

describe("WhatsApp magic-link message decisions", () => {
  it("trims and collapses whitespace and matches the keyword case-insensitively", () => {
    const body = `  LOGIN   with\n Magic Link for QR24x7  `;
    expect(normalizeMagicLinkText(body)).toBe(normalizeMagicLinkText(MAGIC_LINK_KEYWORD));
    expect(
      decideMagicLinkMessage("notify", {
        key: { remoteJid: "919811111111@s.whatsapp.net" },
        message: { conversation: body }
      })
    ).toEqual({ kind: "login", phone: "919811111111", replyTo: "919811111111@s.whatsapp.net" });
    expect(
      decideMagicLinkMessage("notify", {
        key: { remoteJid: "919811111111@s.whatsapp.net" },
        message: { conversation: `${MAGIC_LINK_KEYWORD} please` }
      }).kind
    ).toBe("ignore");
  });

  it("accepts the exact signup keyword while rejecting extra text", () => {
    const message = (text: string) => ({
      key: { remoteJid: "919811111111@s.whatsapp.net" },
      message: { conversation: text }
    });
    expect(decideMagicLinkMessage("notify", message(SIGNUP_MAGIC_LINK_KEYWORD))).toEqual({
      kind: "signup",
      phone: "919811111111",
      replyTo: "919811111111@s.whatsapp.net"
    });
    expect(decideMagicLinkMessage("notify", message(`${SIGNUP_MAGIC_LINK_KEYWORD} please`)).kind).toBe("ignore");
  });

  it("ignores requests older than ten minutes across supported timestamp formats", () => {
    const now = 1_800_000_000_000;
    const request = {
      key: { remoteJid: "919811111111@s.whatsapp.net" },
      message: { conversation: MAGIC_LINK_KEYWORD }
    };
    const staleSeconds = now / 1000 - 601;

    for (const messageTimestamp of [staleSeconds, String(staleSeconds), { toNumber: () => staleSeconds }]) {
      expect(decideMagicLinkMessage("notify", { ...request, messageTimestamp }, now).kind).toBe("ignore");
    }

    expect(
      decideMagicLinkMessage("notify", { ...request, messageTimestamp: now / 1000 - 600 }, now).kind
    ).toBe("login");
  });

  it("accepts missing or unparseable message timestamps", () => {
    const now = 1_800_000_000_000;
    const request = {
      key: { remoteJid: "919811111111@s.whatsapp.net" },
      message: { conversation: MAGIC_LINK_KEYWORD }
    };

    expect(decideMagicLinkMessage("notify", request, now).kind).toBe("login");
    expect(decideMagicLinkMessage("notify", { ...request, messageTimestamp: "unknown" }, now).kind).toBe("login");
    expect(
      decideMagicLinkMessage("notify", { ...request, messageTimestamp: { toNumber: () => { throw new Error(); } } }, now)
        .kind
    ).toBe("login");
  });

  it("extracts direct phone JIDs and resolves LID JIDs through senderPn or participantPn", () => {
    expect(phoneFromWhatsAppJid("919811111111:4@s.whatsapp.net")).toBe("919811111111");
    expect(phoneFromWhatsAppJid("12345678901234@lid", "+919811111111@s.whatsapp.net")).toBe("919811111111");
    expect(phoneFromWhatsAppJid("12345678901234@lid", undefined, "919811111111:4@s.whatsapp.net")).toBe("919811111111");

    const lid = decideMagicLinkMessage("notify", {
      key: { remoteJid: "12345678901234@lid", senderPn: "919811111111@s.whatsapp.net" },
      message: { extendedTextMessage: { text: MAGIC_LINK_KEYWORD } }
    });
    expect(lid).toEqual({ kind: "login", phone: "919811111111", replyTo: "12345678901234@lid" });
  });

  it("ignores groups, broadcasts, status, non-notify events, and messages from the bot", () => {
    for (const remoteJid of ["123-456@g.us", "status@broadcast", "123@broadcast"]) {
      expect(decideMagicLinkMessage("notify", {
        key: { remoteJid },
        message: { conversation: MAGIC_LINK_KEYWORD }
      }).kind).toBe("ignore");
    }
    expect(decideMagicLinkMessage("append", {
      key: { remoteJid: "919811111111@s.whatsapp.net" },
      message: { conversation: MAGIC_LINK_KEYWORD }
    }).kind).toBe("ignore");
    expect(decideMagicLinkMessage("notify", {
      key: { remoteJid: "919811111111@s.whatsapp.net", fromMe: true },
      message: { conversation: MAGIC_LINK_KEYWORD }
    }).kind).toBe("ignore");
    expect(decideMagicLinkMessage("notify", {
      key: { remoteJid: "919811111111@s.whatsapp.net" },
      message: { imageMessage: { caption: MAGIC_LINK_KEYWORD } }
    }).kind).toBe("ignore");
  });

  it("asks for email login when a LID message has no phone number", () => {
    expect(decideMagicLinkMessage("notify", {
      key: { remoteJid: "12345678901234@lid" },
      message: { conversation: MAGIC_LINK_KEYWORD }
    })).toEqual({ kind: "missing-phone", replyTo: "12345678901234@lid" });
  });
});

describe("magic-link token decisions", () => {
  it("creates a 32-byte base64url secret and accepts only live, unused, matching hashes", () => {
    const now = 1_800_000_000_000;
    const created = createMagicLinkSecret(now);
    expect(created.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = { tokenHash: created.tokenHash, expiresAt: created.expiresAt, usedAt: null as Date | null };
    expect(magicLinkUsable(row, created.token, now)).toBe(true);
    expect(magicLinkUsable(row, "A".repeat(43), now)).toBe(false);
    expect(magicLinkUsable(row, created.token, created.expiresAt.getTime())).toBe(false);
    expect(magicLinkUsable({ ...row, usedAt: new Date(now) }, created.token, now)).toBe(false);
  });

  it("allows three link replies per window and blocks the fourth", () => {
    expect(magicLinkRateLimitAllowed(1)).toBe(true);
    expect(magicLinkRateLimitAllowed(3)).toBe(true);
    expect(magicLinkRateLimitAllowed(4)).toBe(false);
  });
});
