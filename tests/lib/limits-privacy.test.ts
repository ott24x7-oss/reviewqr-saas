import { describe, expect, it } from "vitest";
import { exceedsLimit, monthKey, calendarMonthStart } from "../../lib/entitlements";
import {
  anonymizedEmail,
  anonymizedUserPatch,
  reviewContact,
  ACCOUNT_DELETE_RETAINS
} from "../../lib/privacy";
import { belongsToBusiness } from "../../lib/tenant";
import { deviceTypeFromUa, hashIp, SCAN_DEDUPE_MS, shouldCountScan } from "../../lib/scans";
import { hashToken } from "../../lib/tokens";
import { otpStillValid, OTP_MAX_ATTEMPTS, phoneKey } from "../../lib/otp";
import { turnstileRequired } from "../../lib/rate-limit";

describe("plan limits", () => {
  it("denies the next item once the cap is full", () => {
    expect(exceedsLimit(2, 1, 2)).toBe(true);
    expect(exceedsLimit(1, 1, 2)).toBe(false);
    expect(exceedsLimit(9, 2, 10)).toBe(true);
  });

  it("uses the Indian calendar month", () => {
    expect(monthKey(new Date("2026-10-20T12:00:00+05:30"))).toBe("2026-10");
    expect(monthKey(new Date("2026-03-31T20:00:00Z"))).toBe("2026-04");
    expect(calendarMonthStart(new Date("2026-10-20T12:00:00+05:30")).toISOString()).toBe(
      "2026-09-30T18:30:00.000Z"
    );
  });
});

describe("review consent", () => {
  it("keeps the rating path and drops contact when consent is absent", () => {
    const contact = reviewContact({
      consent: false,
      name: "Asha",
      email: "asha@example.com",
      phone: "9811111111"
    });
    expect(contact).toEqual({
      customerName: null,
      customerEmail: null,
      customerPhone: null,
      consented: false
    });
  });

  it("stores contact only after consent", () => {
    const contact = reviewContact({
      consent: true,
      name: " Asha ",
      email: "asha@example.com",
      phone: ""
    });
    expect(contact.consented).toBe(true);
    expect(contact.customerName).toBe("Asha");
    expect(contact.customerEmail).toBe("asha@example.com");
    expect(contact.customerPhone).toBe(null);
  });
});

describe("account deletion", () => {
  it("rewrites the login and clears the name while retaining payments", () => {
    const patch = anonymizedUserPatch("user_1", new Date("2026-10-20T00:00:00Z"));
    expect(patch.email).toBe(anonymizedEmail("user_1"));
    expect(patch.email).toBe("deleted+user_1@invalid.local");
    expect(patch.name).toBeNull();
    expect(patch.password).toBeNull();
    expect(patch.phone).toBeNull();
    expect(ACCOUNT_DELETE_RETAINS).toContain("Payment");
    expect(patch).not.toHaveProperty("payments");
  });
});

describe("tenant ownership", () => {
  it("rejects a location from another business", () => {
    expect(belongsToBusiness("biz_a", "biz_a")).toBe(true);
    expect(belongsToBusiness("biz_b", "biz_a")).toBe(false);
    expect(belongsToBusiness(null, "biz_a")).toBe(false);
  });
});

describe("QR scan dedupe", () => {
  it("counts the first hit and skips another inside 30 minutes", () => {
    const now = Date.parse("2026-10-20T10:00:00Z");
    expect(shouldCountScan(null, now)).toBe(true);
    expect(shouldCountScan(new Date(now - 5 * 60 * 1000), now)).toBe(false);
    expect(shouldCountScan(new Date(now - SCAN_DEDUPE_MS), now)).toBe(true);
  });

  it("hashes the IP with the salt and does not keep the raw address", () => {
    const hashed = hashIp("203.0.113.8", "salt");
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toContain("203.0.113.8");
    expect(hashIp("203.0.113.8", "salt")).toBe(hashed);
    expect(hashIp("203.0.113.8", "other")).not.toBe(hashed);
    expect(deviceTypeFromUa("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("mobile");
  });
});

describe("secrets and OTP", () => {
  it("stores a hash, not the reset token", () => {
    const raw = "abc123token";
    const hashed = hashToken(raw);
    expect(hashed).not.toBe(raw);
    expect(hashToken(raw)).toBe(hashed);
  });

  it("rejects an OTP after the attempt cap or expiry", () => {
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 1000);
    expect(otpStillValid(future, 0)).toBe(true);
    expect(otpStillValid(future, OTP_MAX_ATTEMPTS)).toBe(false);
    expect(otpStillValid(past, 0)).toBe(false);
    expect(phoneKey("+91 98111 11111")).toBe("9811111111");
  });
});

describe("Turnstile", () => {
  it("requires a token only when a secret is configured", () => {
    expect(turnstileRequired(true, "")).toBe("missing");
    expect(turnstileRequired(true, undefined)).toBe("missing");
    expect(turnstileRequired(true, "tok")).toBe("verify");
    expect(turnstileRequired(false, "")).toBe("skip");
  });
});
