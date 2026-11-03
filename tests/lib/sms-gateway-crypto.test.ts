import { describe, expect, it } from "vitest";
import { smsGatewaySignature, verifySmsGatewaySignature } from "../../lib/payments/sms-gateway-crypto";

describe("SMS gateway HMAC protocol", () => {
  const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const timestamp = "1730000000000";
  // Fixture matches GatewayApi.java's HmacSHA256(key UTF-8, raw body + ':' + timestamp).
  const rawBody = '{"deviceId":"test-device","sender":"VM-HDFCBK","body":"INR 999.37 has been credited. UPI Ref 123456789012","timestamp":1730000000000}';
  const signature = "049339ea6a88dcd3023827377dee5f3af355a8d9040925ff69ed19fb42c66bee";

  it("matches the Android APK signature fixture", () => {
    expect(smsGatewaySignature(key, rawBody, timestamp)).toBe(signature);
    expect(verifySmsGatewaySignature({ signingKey: key, rawBody, timestamp, signature, nowMs: 1730000000000 })).toBe(true);
  });

  it("rejects a modified body, bad signature, and timestamps outside 30 minutes", () => {
    expect(verifySmsGatewaySignature({ signingKey: key, rawBody: `${rawBody} `, timestamp, signature, nowMs: 1730000000000 })).toBe(false);
    expect(verifySmsGatewaySignature({ signingKey: key, rawBody, timestamp, signature: "0".repeat(64), nowMs: 1730000000000 })).toBe(false);
    expect(verifySmsGatewaySignature({ signingKey: key, rawBody, timestamp, signature, nowMs: 1730000000000 + 30 * 60_000 + 1 })).toBe(false);
  });
});
