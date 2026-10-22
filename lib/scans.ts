import crypto from "crypto";
import { prisma } from "./db";
import { getClientIp } from "./utils";

/** Same code + same IP hash inside this window does not increment QRCode.scans. */
export const SCAN_DEDUPE_MS = 30 * 60 * 1000;

export function scanSalt() {
  return process.env.QR_SCAN_SALT || process.env.NEXTAUTH_SECRET || "reviewqr-scan";
}

export function hashIp(ip: string, salt = scanSalt()) {
  return crypto.createHash("sha256").update(`${salt}|${ip}`).digest("hex");
}

export function shouldCountScan(lastAt: Date | null, now = Date.now()) {
  if (!lastAt) return true;
  return now - lastAt.getTime() >= SCAN_DEDUPE_MS;
}

export function deviceTypeFromUa(ua: string): "mobile" | "tablet" | "desktop" {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|iphone|android/.test(s)) return "mobile";
  return "desktop";
}

/** Writes a scan row and increments QRCode.scans once per IP hash per 30 minutes. */
export async function recordQrScan(
  qrId: string,
  headers: Headers,
  source: "qr" | "nfc" | "link" = "qr",
  extra?: { direct?: boolean; target?: string }
) {
  const ipHash = hashIp(getClientIp(headers));
  const since = new Date(Date.now() - SCAN_DEDUPE_MS);
  const recent = await prisma.qrScan.findFirst({
    where: { qrCodeId: qrId, ipHash, createdAt: { gte: since } },
    select: { createdAt: true }
  });
  if (recent && !shouldCountScan(recent.createdAt)) return { counted: false as const };
  const direct = extra?.direct === true;
  await prisma.qrScan.create({
    data: {
      qrCodeId: qrId,
      ipHash,
      deviceType: deviceTypeFromUa(headers.get("user-agent") || ""),
      source,
      event: "view",
      direct,
      target: direct ? (extra?.target || "").slice(0, 40) : ""
    }
  });
  await prisma.qRCode.update({
    where: { id: qrId },
    data: { scans: { increment: 1 } }
  });
  return { counted: true as const };
}
