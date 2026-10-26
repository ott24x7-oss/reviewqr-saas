export function formatAdminMoney(paise: number, lang: "en" | "hi" = "en") {
  const rupees = Math.round(paise / 100);
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  return `₹${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(rupees)}`;
}

export function formatAdminCompact(paise: number, lang: "en" | "hi" = "en") {
  const rupees = Math.abs(paise / 100);
  const prefix = paise < 0 ? "−" : "";
  if (rupees >= 10_000_000) return `${prefix}₹${trimDecimal(rupees / 10_000_000)} ${lang === "hi" ? "करोड़" : "Cr"}`;
  if (rupees >= 100_000) return `${prefix}₹${trimDecimal(rupees / 100_000)} ${lang === "hi" ? "लाख" : "L"}`;
  return `${prefix}${formatAdminMoney(Math.abs(paise), lang)}`;
}

function trimDecimal(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: value < 100 ? 1 : 0 }).format(value);
}

export function validateMoneyReason(reason: string) {
  return reason.trim().length >= 3;
}

export function formatAdminDate(iso: string, lang: "en" | "hi" = "en") {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}
