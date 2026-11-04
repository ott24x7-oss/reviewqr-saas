import { getSupportWhatsApp } from "@/lib/settings";

export function formatRupees(paise: number) {
  const rupees = paise / 100;
  const fraction = paise % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fraction ? 2 : 0,
    maximumFractionDigits: fraction ? 2 : 0
  }).format(rupees);
}

/** wa.me link for platform support. Null when no number is configured. */
export async function talkToUsHref() {
  const digits = await getSupportWhatsApp();
  if (digits.length < 8) return null;
  const text = "Hi, I want a QR and NFC stand for my business.";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
