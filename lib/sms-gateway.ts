import { createHash, randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, isEncryptionEnabled } from "./crypto";
import { prisma } from "./db";
import { getPaymentsConfig } from "./settings";
import { recordBankCredit, bankMessageHash } from "./bank-credit-ledger";
import { parseBankSms } from "./payments/bank-parser";
import { verifySmsGatewaySignature } from "./payments/sms-gateway-crypto";

export const SMS_GATEWAY_MERCHANT_ID = "qr24x7";
const PAIR_TTL_MS = 10 * 60_000;

export function hashEnrollmentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSmsGatewayPairing(serverUrl: string) {
  if (!isEncryptionEnabled()) throw new Error("Set APP_ENCRYPTION_KEY before pairing the SMS gateway.");
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + PAIR_TTL_MS);
  await prisma.smsGatewayPairingToken.create({ data: { tokenHash: hashEnrollmentToken(token), expiresAt } });
  return {
    type: "YOUPI_SMS_GATEWAY_PAIR",
    version: "v1",
    serverUrl: new URL(serverUrl).origin,
    enrollmentToken: token,
    merchantId: SMS_GATEWAY_MERCHANT_ID,
    expiresAt: expiresAt.getTime()
  };
}

export async function enrollSmsGatewayDevice(input: {
  enrollmentToken: string;
  deviceName: string;
  deviceModel: string;
  version: string;
  merchantId: string;
}) {
  if (!isEncryptionEnabled()) throw new Error("Set APP_ENCRYPTION_KEY before pairing the SMS gateway.");
  if (input.merchantId !== SMS_GATEWAY_MERCHANT_ID) throw new Error("Invalid merchant id.");
  const tokenHash = hashEnrollmentToken(input.enrollmentToken);
  const now = new Date();
  const signingKey = randomBytes(32).toString("hex");
  const result = await prisma.$transaction(async (tx) => {
    const consumed = await tx.smsGatewayPairingToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now }
    });
    if (!consumed.count) return null;
    const device = await tx.smsGatewayDevice.create({ data: {
      name: (input.deviceName || "Android device").slice(0, 100),
      model: (input.deviceModel || input.deviceName || "Android").slice(0, 100),
      version: (input.version || "").slice(0, 40),
      signingKey: encryptSecret(signingKey),
      active: true,
      lastSeenAt: now
    } });
    return device;
  });
  if (!result) throw new Error("Pairing token is expired or already used.");
  return { paired: true, deviceId: result.id, signingKey, merchantId: SMS_GATEWAY_MERCHANT_ID };
}

export async function authorizeSmsGatewayRequest(input: {
  rawBody: string;
  deviceId: string;
  timestamp: string;
  signature: string;
}) {
  if (!input.deviceId || !input.timestamp || !input.signature) return null;
  const device = await prisma.smsGatewayDevice.findFirst({ where: { id: input.deviceId, active: true } });
  if (!device) return null;
  const signingKey = decryptSecret(device.signingKey);
  if (!signingKey || !verifySmsGatewaySignature({
    signingKey,
    rawBody: input.rawBody,
    timestamp: input.timestamp,
    signature: input.signature
  })) return null;
  await prisma.smsGatewayDevice.updateMany({ where: { id: device.id, active: true }, data: { lastSeenAt: new Date() } });
  return device;
}

/** Heartbeat remains unsigned because the unchanged APK sends only deviceId and SIM metadata. */
export async function touchKnownSmsGatewayDevice(deviceId: string) {
  if (!deviceId) return false;
  const updated = await prisma.smsGatewayDevice.updateMany({
    where: { id: deviceId, active: true }, data: { lastSeenAt: new Date() }
  });
  return updated.count === 1;
}

export async function ingestSmsGatewayMessage(input: {
  deviceId: string;
  sender: string;
  body: string;
  timestamp: number;
  signature: string;
  rawBody: string;
}) {
  const cfg = await getPaymentsConfig();
  const parsed = parseBankSms(input.sender, input.body, cfg.smsSenderAllow.split(",").map((value) => value.trim()).filter(Boolean));
  if (!parsed) return { ok: true, status: "OBSERVED", stored: false, duplicate: false };
  const receivedAt = Number.isFinite(input.timestamp) && input.timestamp > 0
    ? new Date(input.timestamp) : new Date();
  if (!Number.isFinite(receivedAt.getTime()) || receivedAt.getTime() > Date.now() + 30 * 60_000) {
    return { ok: true, status: "OBSERVED", stored: false, duplicate: false };
  }
  // Excerpt contains only an accepted bank credit SMS and is clipped again by the ledger.
  const result = await recordBankCredit({
    source: "sms",
    amountPaise: parsed.amountPaise,
    utr: parsed.utr,
    payerName: parsed.payerName,
    sender: input.sender,
    receivedAt,
    rawHash: bankMessageHash(`sms:${input.deviceId}:${input.sender}:${input.timestamp}:${input.body}`),
    signature: input.signature,
    bodyExcerpt: input.body.replace(/\s+/g, " ").trim().slice(0, 1200),
    deviceId: input.deviceId
  });
  return { ok: true, status: "OBSERVED", stored: true, duplicate: result.duplicate, matched: result.matched };
}

export async function listSmsGatewayDevices() {
  const rows = await prisma.smsGatewayDevice.findMany({ orderBy: { createdAt: "desc" } });
  const onlineCutoff = Date.now() - 6 * 60_000;
  return rows.map(({ signingKey: _signingKey, ...device }) => ({
    ...device,
    online: device.active && !!device.lastSeenAt && device.lastSeenAt.getTime() >= onlineCutoff
  }));
}
