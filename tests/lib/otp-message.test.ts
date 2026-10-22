import { describe, expect, it, vi } from "vitest";
import { deliverOtpCode, indiaE164, otpLoginMessage, type DeliverOtpDeps } from "../../lib/otp-message";

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
    expect(text).toContain("123456 is your WatShop login code. Valid 5 minutes. Do not share it with anyone.");
    expect(text).toContain("123456 आपका WatShop लॉगिन कोड है। 5 मिनट तक वैध। किसी से शेयर न करें।");
    expect(otpLoginMessage("123456", "  ")).toContain("your ReviewQR login code");
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
