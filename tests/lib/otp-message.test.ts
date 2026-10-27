import { describe, expect, it, vi } from "vitest";
import {
  deliverOtpCode,
  enforceOtpLimits,
  indiaE164,
  otpGateError,
  otpIpLimits,
  otpEmailHtml,
  otpLoginMessage,
  otpPhoneLimits,
  otpWrongCodeError,
  OTP_EXPIRED,
  OTP_INVALID,
  OTP_TOO_MANY,
  type DeliverOtpDeps
} from "../../lib/otp-message";

function deps(over: Partial<DeliverOtpDeps> = {}): DeliverOtpDeps & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    phone: "9811111111",
    email: "owner@example.com",
    code: "123456",
    brand: "WatShop",
    baileysConnected: false,
    cloudConfigured: false,
    env: "development",
    sendBaileys: vi.fn(async () => {
      calls.push("baileys");
    }),
    sendCloud: vi.fn(async () => {
      calls.push("cloud");
    }),
    sendMail: vi.fn(async () => {
      calls.push("email");
    }),
    log: vi.fn(() => {
      calls.push("log");
    }),
    calls,
    ...over
  };
}

describe("OTP message and phone", () => {
  it("builds the bilingual template with the platform brand", () => {
    const text = otpLoginMessage("123456", " WatShop ");
    expect(text.split("\n")[0]).toBe("*123456* is your WatShop login code.");
    expect(text).toContain("Valid for 5 minutes. Do not share this code with anyone.");
    expect(text).toContain("*123456* आपका WatShop लॉगिन कोड है।");
    expect(text).toContain("यह 5 मिनट तक मान्य है।");
    expect(otpLoginMessage("123456", "  ")).toContain("your QR24x7 login code");
  });

  it("turns the WhatsApp text into email HTML with a bold code and no asterisks", () => {
    const html = otpEmailHtml(otpLoginMessage("123456", "QR24x7"));
    expect(html).toContain("<strong>123456</strong> is your QR24x7 login code.");
    expect(html).not.toContain("*");
    expect(html).toContain("<br>");
  });

  it("normalises Indian numbers to +91 and rejects short input", () => {
    expect(indiaE164("9811111111")).toBe("+919811111111");
    expect(indiaE164("+91 98111 11111")).toBe("+919811111111");
    expect(indiaE164("919811111111")).toBe("+919811111111");
    expect(indiaE164("12345")).toBe("");
  });
});

describe("OTP delivery order", () => {
  it("uses Baileys when the session is connected", async () => {
    const d = deps({ baileysConnected: true, cloudConfigured: true });
    await expect(deliverOtpCode(d)).resolves.toBe("whatsapp");
    expect(d.calls).toEqual(["baileys"]);
    expect(d.sendBaileys).toHaveBeenCalledWith("+919811111111", expect.stringContaining("123456"));
  });

  it("falls through when Baileys is disconnected", async () => {
    const d = deps({ baileysConnected: false, cloudConfigured: true });
    await expect(deliverOtpCode(d)).resolves.toBe("whatsapp");
    expect(d.calls).toEqual(["cloud"]);
  });

  it("falls through when Baileys send fails", async () => {
    const calls: string[] = [];
    const d = deps({
      baileysConnected: true,
      cloudConfigured: true,
      sendBaileys: vi.fn(async () => {
        calls.push("baileys");
        throw new Error("timed out");
      }),
      sendCloud: vi.fn(async () => {
        calls.push("cloud");
      })
    });
    await expect(deliverOtpCode(d)).resolves.toBe("whatsapp");
    expect(calls).toEqual(["baileys", "cloud"]);
  });

  it("uses email when both WhatsApp paths fail", async () => {
    const d = deps({
      baileysConnected: true,
      cloudConfigured: true,
      sendBaileys: vi.fn(async () => {
        throw new Error("down");
      }),
      sendCloud: vi.fn(async () => {
        throw new Error("down");
      })
    });
    await expect(deliverOtpCode(d)).resolves.toBe("email");
    expect(d.sendMail).toHaveBeenCalledWith(
      "owner@example.com",
      "Your WatShop login code",
      expect.stringContaining("123456")
    );
  });

  it("logs the code outside production and stays quiet in production", async () => {
    const dev = deps({ email: null, env: "development" });
    await expect(deliverOtpCode(dev)).resolves.toBe("dev");
    expect(dev.log).toHaveBeenCalledWith("[otp] +919811111111 code 123456");

    const prod = deps({
      email: null,
      env: "production",
      baileysConnected: true,
      cloudConfigured: true,
      sendBaileys: vi.fn(async () => {
        throw new Error("down");
      }),
      sendCloud: vi.fn(async () => {
        throw new Error("down");
      })
    });
    await expect(deliverOtpCode(prod)).resolves.toBe("none");
    expect(prod.log).not.toHaveBeenCalled();
  });

  it("does not throw when the number cannot be normalised", async () => {
    const d = deps({ phone: "12" });
    await expect(deliverOtpCode(d)).resolves.toBe("none");
    expect(d.calls).toEqual([]);
  });
});

describe("OTP limits and verify errors", () => {
  it("keeps the old windows and adds the 15-minute cap and 30-second cooldown", () => {
    expect(otpIpLimits("1.2.3.4", "login")).toEqual([
      { key: "otp-req:1.2.3.4", limit: 8, windowSeconds: 600 },
      { key: "otp-req-15:1.2.3.4", limit: 20, windowSeconds: 900 }
    ]);
    expect(otpIpLimits("1.2.3.4", "signup")[0]).toEqual({
      key: "otp-signup:1.2.3.4",
      limit: 8,
      windowSeconds: 600
    });
    expect(otpPhoneLimits("9811111111")).toEqual([
      { key: "otp-phone:9811111111", limit: 5, windowSeconds: 600 },
      { key: "otp-phone-15:9811111111", limit: 5, windowSeconds: 900 },
      { key: "otp-cooldown:9811111111", limit: 1, windowSeconds: 30 }
    ]);
  });

  it("raises the IP limit with OTP_IP_LIMIT, same pattern as REGISTER_IP_LIMIT", async () => {
    const original = process.env.OTP_IP_LIMIT;
    process.env.OTP_IP_LIMIT = "200";
    try {
      expect(otpIpLimits("1.2.3.4", "login")).toEqual([
        { key: "otp-req:1.2.3.4", limit: 200, windowSeconds: 600 },
        { key: "otp-req-15:1.2.3.4", limit: 200, windowSeconds: 900 }
      ]);
      expect(otpIpLimits("1.2.3.4", "signup")[0]).toEqual({
        key: "otp-signup:1.2.3.4",
        limit: 200,
        windowSeconds: 600
      });
    } finally {
      if (original === undefined) delete process.env.OTP_IP_LIMIT;
      else process.env.OTP_IP_LIMIT = original;
    }
  });

  it("stops when a limit is used up", async () => {
    const calls: string[] = [];
    const result = await enforceOtpLimits(otpPhoneLimits("9811111111"), async (limit) => {
      calls.push(limit.key);
      return { ok: !limit.key.startsWith("otp-phone-15:") };
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.key).toBe("otp-phone-15:9811111111");
    expect(calls).toEqual(["otp-phone:9811111111", "otp-phone-15:9811111111"]);
  });

  it("uses one invalid message for a missing code and separates expiry from the attempt cap", () => {
    expect(otpGateError(null, 5)).toBe(OTP_INVALID);
    expect(otpGateError({ expires: new Date(Date.now() - 1000), attempts: 0 }, 5)).toBe(OTP_EXPIRED);
    expect(otpGateError({ expires: new Date(Date.now() + 60_000), attempts: 5 }, 5)).toBe(OTP_TOO_MANY);
    expect(otpWrongCodeError(4, 5)).toBe(OTP_INVALID);
    expect(otpWrongCodeError(5, 5)).toBe(OTP_TOO_MANY);
  });
});
