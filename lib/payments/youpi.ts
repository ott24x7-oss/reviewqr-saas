/**
 * YouPI gateway adapter. Payment creation stays on the server.
 * https://github.com/gxurav1710/YouPI-PG
 */
import crypto from "crypto";
import { timingSafeEqualString } from "../timing-safe";
import { getPaymentsConfig } from "../settings";

export type YoupiPayment = {
  paymentId: string;
  orderId: string;
  amount?: string;
  amountPaise?: number;
  status?: string;
  checkoutUrl?: string;
  utr?: string | null;
  queuePosition?: number;
  verificationLevel?: number;
};

export type YoupiConfig = {
  baseUrl: string;
  merchantId: string;
  webhookSecret: string;
};

export async function getYoupiConfig(): Promise<YoupiConfig> {
  const cfg = await getPaymentsConfig();
  return {
    baseUrl: (cfg.youpiBaseUrl || process.env.YOUPI_BASE_URL || "").replace(/\/$/, ""),
    merchantId: cfg.youpiMerchantId || process.env.YOUPI_MERCHANT_ID || "",
    webhookSecret: cfg.youpiWebhookSecret || process.env.YOUPI_WEBHOOK_SECRET || ""
  };
}

export function youpiConfigured(cfg: YoupiConfig) {
  return !!(cfg.baseUrl && cfg.merchantId);
}

function paiseFromRemote(remote: { amount?: string; amountPaise?: number }): number | null {
  if (typeof remote.amountPaise === "number" && Number.isFinite(remote.amountPaise)) {
    return remote.amountPaise;
  }
  if (remote.amount != null && remote.amount !== "") {
    const rupees = Number(remote.amount);
    if (!Number.isFinite(rupees)) return null;
    return Math.round(rupees * 100);
  }
  return null;
}

export function youpiAmountsMatch(
  expectedPaise: number,
  remote: { amount?: string; amountPaise?: number }
): boolean {
  const got = paiseFromRemote(remote);
  return got != null && got === expectedPaise;
}

export function youpiStatusSuccess(status: string | undefined) {
  return ["SUCCESS", "CAPTURED", "PAID", "COMPLETED"].includes(String(status || "").toUpperCase());
}

export function youpiStatusFailed(status: string | undefined) {
  return ["FAILED", "EXPIRED", "CANCELLED", "CANCELED"].includes(String(status || "").toUpperCase());
}

/** Paid and seen by at least one bank alert (verificationLevel 0 means unverified). */
export function youpiConfirmed(remote: { status?: string; verificationLevel?: number }) {
  return youpiStatusSuccess(remote.status) && (remote.verificationLevel ?? 0) >= 1;
}

/** The gateway record must point at our order and, once known, at the same gateway payment. */
export function youpiMatchesOrder(
  remote: { orderId?: string; paymentId?: string },
  order: { id: string; providerPaymentId?: string | null }
) {
  if (!remote.orderId || remote.orderId !== order.id) return false;
  if (order.providerPaymentId && remote.paymentId !== order.providerPaymentId) return false;
  return true;
}

function toNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parsePayment(json: any, fallback: { paymentId?: string; orderId?: string }): YoupiPayment {
  return {
    paymentId: String(json.paymentId || fallback.paymentId || ""),
    orderId: String(json.orderId || fallback.orderId || ""),
    amount: json.amount != null ? String(json.amount) : undefined,
    amountPaise: toNumber(json.amountPaise),
    status: json.status,
    checkoutUrl: json.checkoutUrl,
    utr: json.utr ?? null,
    queuePosition: toNumber(json.queuePosition),
    verificationLevel: toNumber(json.verificationLevel)
  };
}

/** HMAC over the raw body. Header value is `sha256=<hex>`. Timestamp is ms or seconds. */
export function verifyYoupiWebhook(opts: {
  rawBody: string;
  signature: string;
  timestamp: string;
  secret: string;
  now?: number;
}): { ok: true } | { ok: false; error: string } {
  if (!opts.secret) return { ok: false, error: "Webhook secret is not configured" };
  const ts = Number(opts.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, error: "Missing timestamp" };
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const now = opts.now ?? Date.now();
  if (Math.abs(now - ms) > 5 * 60 * 1000) return { ok: false, error: "Timestamp is too old" };

  const expected = "sha256=" + crypto.createHmac("sha256", opts.secret).update(opts.rawBody).digest("hex");
  const got = (opts.signature || "").trim();
  if (!timingSafeEqualString(got, expected)) return { ok: false, error: "Invalid signature" };
  return { ok: true };
}

async function youpiFetch(cfg: YoupiConfig, path: string, init: RequestInit) {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "X-Merchant-Id": cfg.merchantId,
      ...(init.headers || {})
    }
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    throw new Error(json.message || json.error || `YouPI request failed (${res.status})`);
  }
  return json;
}

export async function youpiCreatePayment(opts: {
  orderId: string;
  amountPaise: number;
  returnUrl: string;
  idempotencyKey: string;
}): Promise<YoupiPayment> {
  const cfg = await getYoupiConfig();
  if (!youpiConfigured(cfg)) throw new Error("YouPI is not configured");
  const json = await youpiFetch(cfg, "/api/v1/payments", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Idempotency-Key": opts.idempotencyKey
    },
    body: JSON.stringify({
      orderId: opts.orderId,
      amount: (opts.amountPaise / 100).toFixed(2),
      currency: "INR",
      returnUrl: opts.returnUrl
    })
  });
  return parsePayment(json, { orderId: opts.orderId });
}

export async function youpiGetPayment(paymentId: string): Promise<YoupiPayment> {
  const cfg = await getYoupiConfig();
  if (!youpiConfigured(cfg)) throw new Error("YouPI is not configured");
  const json = await youpiFetch(cfg, `/api/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET"
  });
  return parsePayment(json, { paymentId });
}
