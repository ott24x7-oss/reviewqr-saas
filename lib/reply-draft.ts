/** A public reply that does not repeat a private note or a phone number. */
export const SAFE_PUBLIC_REPLY =
  "Thank you for visiting. We read every note and will keep working to improve.";

export const SAFE_WHATSAPP_REPLY =
  "Thank you for telling us. We are sorry it fell short and we want to make it right.";

export function quotesPrivateMessage(reply: string, message: string) {
  const hay = reply.toLowerCase().replace(/\s+/g, " ");
  const words = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);
  if (words.length >= 4) {
    for (let i = 0; i <= words.length - 4; i += 1) {
      if (hay.includes(words.slice(i, i + 4).join(" "))) return true;
    }
    return false;
  }
  if (words.length >= 2) {
    const phrase = words.join(" ");
    return phrase.length >= 12 && hay.includes(phrase);
  }
  return false;
}

export function containsPhone(reply: string, phone: string | null | undefined) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 8) return false;
  const tail = digits.slice(-10);
  return reply.replace(/\D/g, "").includes(tail.slice(-8));
}

export function safePublicReply(reply: string, message: string, phone: string | null | undefined) {
  const cleaned = reply.replace(/\s+/g, " ").trim();
  if (
    cleaned.length < 5 ||
    quotesPrivateMessage(cleaned, message) ||
    containsPhone(cleaned, phone)
  ) {
    return SAFE_PUBLIC_REPLY;
  }
  return cleaned.slice(0, 600);
}

export function safeWhatsappReply(reply: string, phone: string | null | undefined) {
  let cleaned = reply.replace(/\s+/g, " ").trim();
  if (containsPhone(cleaned, phone)) {
    const tail = (phone || "").replace(/\D/g, "").slice(-10);
    const pattern = new RegExp(tail.split("").join("\\D*"), "g");
    cleaned = cleaned.replace(pattern, " ").replace(/\s+/g, " ").trim();
  }
  if (cleaned.length < 5) return SAFE_WHATSAPP_REPLY;
  return cleaned.slice(0, 800);
}

/** Opens a chat with the customer. The text is only what the owner chose to send. */
export function whatsAppReplyHref(phone: string, text?: string | null) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  const base = `https://wa.me/${digits}`;
  const trimmed = (text || "").trim();
  if (!trimmed) return base;
  return `${base}?text=${encodeURIComponent(trimmed.slice(0, 1000))}`;
}
