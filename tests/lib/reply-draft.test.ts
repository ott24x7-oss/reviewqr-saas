import { describe, expect, it } from "vitest";
import {
  SAFE_PUBLIC_REPLY,
  containsPhone,
  quotesPrivateMessage,
  safePublicReply,
  safeWhatsappReply,
  whatsAppReplyHref
} from "../../lib/reply-draft";

const note = "The cold coffee arrived late and the cashier was rude";
const phone = "9876543210";

describe("owner reply drafts", () => {
  it("rejects a public reply that quotes the private note or the phone", () => {
    expect(quotesPrivateMessage("Sorry the cold coffee arrived late today", note)).toBe(true);
    expect(containsPhone("Please call 98765 43210", phone)).toBe(true);
    expect(safePublicReply(`Sorry. ${note}`, note, phone)).toBe(SAFE_PUBLIC_REPLY);
    expect(safePublicReply("Call me at 9876543210", note, phone)).toBe(SAFE_PUBLIC_REPLY);
  });

  it("keeps a public reply that does not repeat the private note", () => {
    const reply = "Thank you for visiting. We will look into this and do better.";
    expect(safePublicReply(reply, note, phone)).toBe(reply);
  });

  it("strips a phone number from the private WhatsApp draft", () => {
    expect(safeWhatsappReply("We can call 9876543210 today", phone)).not.toContain("9876543210");
  });

  it("builds a WhatsApp link only for a real phone, with the owner's own text", () => {
    expect(whatsAppReplyHref("98 7654 3210")).toBe("https://wa.me/9876543210");
    expect(whatsAppReplyHref("9876543210", "We are sorry")).toBe(
      "https://wa.me/9876543210?text=We%20are%20sorry"
    );
    expect(whatsAppReplyHref("123")).toBe(null);
  });
});
