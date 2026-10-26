import { observe } from "@/lib/api/observe";
import { v1Data, v1Error } from "@/lib/api/v1";
import { parseAppEvent } from "@/lib/app/events";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import crypto from "crypto";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  let body: unknown = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return v1Error(400, "VALIDATION", "Invalid request");
  }
  const parsed = parseAppEvent(body);
  if (!parsed.ok) return v1Error(400, "VALIDATION", parsed.error);
  const ip = getClientIp(req.headers);
  const byIp = await rateLimitDb({ key: `app-event:${ip}`, limit: 60, windowSeconds: 3600 });
  if (!byIp.ok) return v1Error(429, "RATE_LIMIT", "Try again in a moment");
  const byInstall = await rateLimitDb({
    key: `app-event-install:${parsed.installId}`,
    limit: 30,
    windowSeconds: 3600
  });
  if (!byInstall.ok) return v1Error(429, "RATE_LIMIT", "Try again in a moment");
  await prisma.$executeRaw`
    INSERT INTO "AppEvent" ("id", "name", "installId", "createdAt")
    VALUES (${crypto.randomUUID()}, ${parsed.name}, ${parsed.installId}, NOW())
  `;
  return v1Data({ ok: true });
}

export const POST = observe(postHandler);
