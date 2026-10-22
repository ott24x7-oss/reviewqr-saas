"use client";

import { signIn } from "next-auth/react";

/** Same-origin path only. A protocol-relative value must not become the next page. */
export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}

function rejected(url: string | null | undefined, error: string | null | undefined) {
  if (error) return true;
  if (!url) return false;
  return /(?:^|[?&])csrf=true(?:&|$)/.test(url) || /(?:^|[?&])error=/.test(url);
}

async function hasSession() {
  try {
    const res = await fetch("/api/auth/session", {
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json && typeof json === "object" && (json as { user?: unknown }).user);
  } catch {
    return false;
  }
}

/**
 * Credentials sign-in reports success when NextAuth redirects to
 * /api/auth/signin?csrf=true, which has no error param and sets no session cookie.
 * Confirm the session, and retry once so a dropped CSRF body can recover.
 */
export async function enterSession(credentials: Record<string, string>, nextPath: string | null | undefined) {
  const path = safeNextPath(nextPath);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const sign = await signIn("credentials", {
        ...credentials,
        redirect: false,
        callbackUrl: path
      });
      if (sign?.error) return { ok: false as const };
      if (!rejected(sign?.url, sign?.error) && (await hasSession())) {
        return { ok: true as const, path };
      }
    } catch {
      /* Ask for a fresh CSRF token on the next attempt. */
    }
  }
  return { ok: false as const };
}
