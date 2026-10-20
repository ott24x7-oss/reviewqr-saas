import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  extendSubscriptionEnd,
  financialYearLabel,
  formatInvoiceNumber,
  splitGst
} from "../../lib/subscription";
import { timingSafeEqualString } from "../../lib/timing-safe";
import { verifyYoupiWebhook } from "../../lib/payments/youpi";

describe("subscription dates and invoices", () => {
  it("uses the Indian financial year", () => {
    expect(financialYearLabel(new Date(2026, 9, 20))).toBe("2026-27");
    expect(financialYearLabel(new Date(2026, 3, 1))).toBe("2026-27");
    expect(financialYearLabel(new Date(2026, 2, 31))).toBe("2025-26");
  });

  it("formats sequential invoice numbers", () => {
    expect(formatInvoiceNumber("2026-27", 1)).toBe("INV-2026-27-0001");
    expect(formatInvoiceNumber("2026-27", 2)).toBe("INV-2026-27-0002");
  });

  it("extends a live plan from its current end by calendar months", () => {
    const now = new Date(2026, 0, 15);
    const end = new Date(2026, 0, 25);
    const next = extendSubscriptionEnd(end, 1, now);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(25);
  });

  it("starts from today when the current end is already past", () => {
    const now = new Date(2026, 0, 15);
    const next = extendSubscriptionEnd(new Date(2026, 0, 1), 1, now);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(15);
  });

  it("splits an inclusive 18% amount into CGST and SGST", () => {
    expect(splitGst(11800, 18, true)).toEqual({ taxable: 10000, cgst: 900, sgst: 900, igst: 0 });
    expect(splitGst(11800, 18, false).igst).toBe(1800);
  });
});

describe("YouPI webhook checks", () => {
  it("rejects a signature whose length does not match", () => {
    const result = verifyYoupiWebhook({
      rawBody: "{}",
      signature: "sha256=abc",
      timestamp: String(Date.now()),
      secret: "test-secret"
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a timestamp older than five minutes", () => {
    const secret = "test-secret";
    const raw = '{"event":"SUCCESS"}';
    const signature = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const result = verifyYoupiWebhook({
      rawBody: raw,
      signature,
      timestamp: String(Date.now() - 10 * 60 * 1000),
      secret
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/old/i);
  });

  it("accepts a fresh matching signature", () => {
    const secret = "test-secret";
    const raw = '{"event":"SUCCESS"}';
    const signature = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const result = verifyYoupiWebhook({
      rawBody: raw,
      signature,
      timestamp: String(Date.now()),
      secret
    });
    expect(result.ok).toBe(true);
  });

  it("does not throw when the compared strings differ in length", () => {
    expect(timingSafeEqualString("short", "much-longer-value")).toBe(false);
    expect(timingSafeEqualString("same", "same")).toBe(true);
  });
});
