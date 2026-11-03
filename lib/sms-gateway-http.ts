import { NextRequest, NextResponse } from "next/server";
import { rateLimitDb } from "./rate-limit";
import { getClientIp } from "./utils";
import {
  authorizeSmsGatewayRequest,
  enrollSmsGatewayDevice,
  ingestSmsGatewayMessage,
  touchKnownSmsGatewayDevice
} from "./sms-gateway";

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function readJson(req: NextRequest, limit = 20_000) {
  const rawBody = await req.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > limit) return { rawBody, body: null };
  try { return { rawBody, body: JSON.parse(rawBody) as Record<string, unknown> }; }
  catch { return { rawBody, body: null }; }
}

async function allowed(key: string, limit: number, windowSeconds: number) {
  const result = await rateLimitDb({ key, limit, windowSeconds });
  return result.ok;
}

export async function pairGateway(req: NextRequest) {
  if (!await allowed(`sms-gateway:pair:${getClientIp(req.headers)}`, 12, 60)) return error("Try again in a moment.", 429);
  const { body } = await readJson(req, 8_000);
  if (!body) return error("Invalid request.", 400);
  try {
    const paired = await enrollSmsGatewayDevice({
      enrollmentToken: String(body.enrollmentToken || ""),
      deviceName: String(body.deviceName || "Android device"),
      deviceModel: String(body.deviceModel || "Android"),
      version: String(body.version || ""),
      merchantId: String(body.merchantId || "")
    });
    return NextResponse.json(paired);
  } catch (cause) {
    const message = cause instanceof Error && cause.message.includes("merchant") ? cause.message : "Pairing token is invalid, expired, or already used.";
    return error(message, 401);
  }
}

async function signedRequest(req: NextRequest, rawBody: string, body: Record<string, unknown>) {
  const deviceId = req.headers.get("X-Device-Id") || "";
  if (!deviceId || String(body.deviceId || "") !== deviceId) return null;
  if (!await allowed(`sms-gateway:ip:${getClientIp(req.headers)}`, 300, 60)) return false;
  if (!await allowed(`sms-gateway:device:${deviceId}:${getClientIp(req.headers)}`, 180, 60)) return false;
  return authorizeSmsGatewayRequest({
    rawBody,
    deviceId,
    timestamp: req.headers.get("X-Timestamp") || "",
    signature: req.headers.get("X-Signature") || ""
  });
}

export async function observeSms(req: NextRequest) {
  const { rawBody, body } = await readJson(req, 20_000);
  if (!body) return error("Invalid request.", 400);
  const device = await signedRequest(req, rawBody, body);
  if (device === false) return error("Rate limit exceeded.", 429);
  if (!device) return error("Unknown device or invalid signature.", 401);
  const smsBody = String(body.body || "");
  if (smsBody.length > 8_000) return error("SMS is too long.", 413);
  const timestamp = Number(body.timestamp);
  try {
    const result = await ingestSmsGatewayMessage({
      deviceId: device.id,
      sender: String(body.sender || "").slice(0, 160),
      body: smsBody,
      timestamp,
      signature: (req.headers.get("X-Signature") || "").toLowerCase(),
      rawBody
    });
    return NextResponse.json(result);
  } catch {
    return error("Could not process this bank message.", 500);
  }
}

export async function heartbeat(req: NextRequest) {
  const { rawBody, body } = await readJson(req, 8_000);
  if (!body) return error("Invalid request.", 400);
  const deviceId = String(body.deviceId || "");
  const timestamp = req.headers.get("X-Timestamp");
  const signature = req.headers.get("X-Signature");
  let authenticated = false;
  if (timestamp || signature || req.headers.get("X-Device-Id")) {
    const device = await signedRequest(req, rawBody, body);
    authenticated = !!device;
  } else {
    if (!await allowed(`sms-gateway:heartbeat-ip:${getClientIp(req.headers)}`, 240, 3600)) return error("Rate limit exceeded.", 429);
    if (!await allowed(`sms-gateway:heartbeat:${deviceId}:${getClientIp(req.headers)}`, 240, 3600)) return error("Rate limit exceeded.", 429);
    authenticated = await touchKnownSmsGatewayDevice(deviceId);
  }
  if (!authenticated) return error("Unknown device or invalid signature.", 401);
  return NextResponse.json({ status: "HEARTBEAT_ACK", timestamp: Date.now(), outbox: [] });
}

export async function pullOutbox(req: NextRequest) {
  const { rawBody, body } = await readJson(req, 8_000);
  if (!body) return error("Invalid request.", 400);
  const device = await signedRequest(req, rawBody, body);
  if (device === false) return error("Rate limit exceeded.", 429);
  if (!device) return error("Unknown device or invalid signature.", 401);
  return NextResponse.json({ messages: [] });
}

export async function outboxResult(req: NextRequest) {
  const { rawBody, body } = await readJson(req, 8_000);
  if (!body) return error("Invalid request.", 400);
  const deviceId = req.headers.get("X-Device-Id") || "";
  if (!await allowed(`sms-gateway:result-ip:${getClientIp(req.headers)}`, 300, 60)) return error("Rate limit exceeded.", 429);
  if (!deviceId || !await allowed(`sms-gateway:result:${deviceId}:${getClientIp(req.headers)}`, 180, 60)) return error("Rate limit exceeded.", 429);
  const device = await authorizeSmsGatewayRequest({
    rawBody,
    deviceId,
    timestamp: req.headers.get("X-Timestamp") || "",
    signature: req.headers.get("X-Signature") || ""
  });
  if (!device) return error("Unknown device or invalid signature.", 401);
  return NextResponse.json({ ok: true, status: "RESULT_ACK" });
}
