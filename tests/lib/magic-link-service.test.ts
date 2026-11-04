import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUserByPhone: vi.fn(),
  issueSignupProof: vi.fn(),
  rateLimitDb: vi.fn(),
  getSiteConfig: vi.fn(),
  createMagicLink: vi.fn()
}));

vi.mock("../../lib/db", () => ({ prisma: { magicLinkToken: { create: mocks.createMagicLink } } }));
vi.mock("../../lib/otp", () => ({ findUserByPhone: mocks.findUserByPhone, issueSignupProof: mocks.issueSignupProof }));
vi.mock("../../lib/rate-limit", () => ({ rateLimitDb: mocks.rateLimitDb }));
vi.mock("../../lib/settings", () => ({ getSiteConfig: mocks.getSiteConfig }));

import { magicLinkReplyForPhone } from "../../lib/auth/magic-link-service";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimitDb.mockResolvedValue({ ok: true, remaining: 2 });
  mocks.getSiteConfig.mockResolvedValue({ appUrl: "https://qr24x7.example" });
  mocks.issueSignupProof.mockResolvedValue("a".repeat(64));
  mocks.createMagicLink.mockResolvedValue(undefined);
});

describe("WhatsApp auth replies", () => {
  it("gives an unregistered number a bilingual, expiring signup link", async () => {
    mocks.findUserByPhone.mockResolvedValue(null);

    const reply = await magicLinkReplyForPhone("+919811111111");

    expect(reply).toContain("https://qr24x7.example/register?signup=" + "a".repeat(64));
    expect(reply).toContain("valid for 10 minutes, one time");
    expect(reply).toContain("अपना QR24x7 अकाउंट बनाएँ");
    expect(reply).not.toMatch(/\/register(?:\s|$)/);
    expect(mocks.issueSignupProof).toHaveBeenCalledWith("9811111111");
    expect(mocks.rateLimitDb).toHaveBeenCalledWith({
      key: "magic-link:9811111111",
      limit: 3,
      windowSeconds: 600
    });
  });

  it("gives a registered number a login link instead of a signup link", async () => {
    mocks.findUserByPhone.mockResolvedValue({ id: "user_1", deletedAt: null, suspendedAt: null });

    const reply = await magicLinkReplyForPhone("9811111111");

    expect(reply).toContain("https://qr24x7.example/m/");
    expect(reply).not.toContain("signup=");
    expect(mocks.issueSignupProof).not.toHaveBeenCalled();
    expect(mocks.createMagicLink).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: "9811111111", userId: "user_1" })
    });
  });
});
