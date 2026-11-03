/** Pure parsers for bank credit alerts. No database or runtime dependencies. */

export type ParsedBankCredit = {
  amountPaise: number;
  utr: string | null;
  payerName: string | null;
};

export type BankEmailInput = {
  from: string;
  subject?: string;
  text?: string;
  authenticationResults?: string | string[];
  arcAuthenticationResults?: string | string[];
};

export const BANK_EMAIL_DOMAINS = [
  "axisbank.in", "axis.bank.in", "axisbank.com", "slice.bank.in", "paytm.com",
  "hdfcbank.net", "hdfcbank.com", "icicibank.com", "sbi.co.in", "alerts.sbi",
  "kotak.com", "federalbank.co.in", "yesbank.in", "indusind.com", "pnb.co.in",
  "bankofbaroda.com", "bankofbaroda.in", "idfcfirstbank.com", "canarabank.com",
  "unionbankofindia.com", "ippbonline.com", "binance.com", "paypal.com"
] as const;

export const DEFAULT_TRUSTED_AUTH_SERV_IDS = ["mx.google.com"] as const;

const AMOUNT_PATTERNS = [
  /\binr\s*([\d,]+(?:\.\d{1,2})?)\s*(?:was|has\s*been|is)?\s*credited\b/i,
  /\bamount\s*credited\s*[:\s]*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /\bcredited\s*(?:with|by|for|of)?\s*[:\s]*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has\s*been\s*|is\s*)?credited\b/i,
  /\b(?:received|deposited)\s*(?:payment\s*(?:of\s*)?)?(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{1,2})?)(?:\s*(?:via\s*upi|in\s*your\s*(?:account|a\/c)))?\b/i,
  /\bpayment\s*received\s*(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /\bcredited\s*(?:to\s*your\s*(?:account|a\/c)\s*)?(?:by\s*)?(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/i
];

const UTR_PATTERNS = [
  /\b(?:utr|rrn|upi\s*ref(?:erence)?|transaction\s*(?:id|ref(?:erence)?)|ref(?:erence)?(?:\s*(?:no\.?|number|id))?)\s*(?:no\.?|number|id)?\s*[:#./-]?\s*(\d{8,22})\b/i,
  /\bupi\s*\/\s*[a-z0-9]+\s*\/\s*(\d{8,22})\b/i
];

function paise(value: string): number | null {
  const normalized = value.replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [rupees, fraction = ""] = normalized.split(".");
  const amount = Number(rupees) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function findAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const amount = paise(match[1]);
      if (amount != null) return amount;
    }
  }
  return null;
}

function findUtr(text: string): string | null {
  for (const pattern of UTR_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].replace(/\D/g, "");
  }
  return null;
}

function findPayer(text: string): string | null {
  const match = /\b(?:from|by|payer\s*name)\s*[:\-]?\s*([a-z][a-z .'-]{1,48}?)(?=\s+(?:upi|a\/c|account|ref|utr|rrn|on\s+\d)|[.;,\n]|$)/i.exec(text);
  const value = match?.[1]?.trim().replace(/\s+/g, " ");
  return value && !/@|\d{4,}/.test(value) ? value.slice(0, 64) : null;
}

const NON_CREDIT = /\b(?:debited|debit|withdraw(?:n|al)?|spent|purchase|sent\s+(?:to|from)|otp|one[ -]?time\s+password|collect\s+request|request\s+money|approve\s+collect|payment\s+request|mandate\s+request)\b/i;
const CREDIT_CUE = /\b(?:credited|credit(?:ed)?|received|deposit(?:ed)?|payment\s+received|added\s+to\s+(?:your\s+)?(?:account|a\/c))\b/i;

function hasBankHeader(sender: string, allowList: string[] = []): boolean {
  const value = sender.trim().toUpperCase();
  // Indian transactional SMS headers commonly look like AX-AXISBK-S or VM-HDFCBK.
  if (!/^(?:[A-Z]{2}-)?[A-Z0-9]{3,9}(?:-[A-Z])?$/.test(value) || /\d{5,}/.test(value)) return false;
  const allowed = allowList.map((item) => item.trim().toUpperCase()).filter(Boolean);
  return !allowed.length || allowed.some((entry) => value === entry || value.includes(entry));
}

export function parseBankSms(sender: string, body: string, allowList: string[] = []): ParsedBankCredit | null {
  if (!hasBankHeader(sender, allowList)) return null;
  const text = String(body || "").slice(0, 12000);
  if (NON_CREDIT.test(text) || !CREDIT_CUE.test(text)) return null;
  const amountPaise = findAmount(text);
  if (!amountPaise) return null;
  return { amountPaise, utr: findUtr(text), payerName: findPayer(text) };
}

function senderAddress(from: string): string | null {
  const angle = /<\s*([^<>\s]+@[^<>\s]+)\s*>/.exec(from);
  const candidate = (angle?.[1] || from.trim()).replace(/^mailto:/i, "");
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(candidate)) return null;
  return candidate.toLowerCase();
}

function isAllowedDomain(domain: string, configuredDomains: string[]): boolean {
  const allowed = [...BANK_EMAIL_DOMAINS, ...configuredDomains]
    .map((value) => value.trim().toLowerCase().replace(/^.*@/, ""))
    .filter(Boolean);
  return allowed.some((entry) => domain === entry || domain.endsWith(`.${entry}`));
}

function isExplicitlyAllowedDomain(domain: string, configuredDomains: string[]): boolean {
  const allowed = [...BANK_EMAIL_DOMAINS, ...configuredDomains]
    .map((value) => normalizeDomain(value.replace(/^.*@/, "")))
    .filter(Boolean);
  return allowed.includes(domain);
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "").replace(/\.$/, "");
}

function authservId(raw: string): string {
  return normalizeDomain(raw.split(";", 1)[0]?.trim().split(/\s+/, 1)[0] || "");
}

function identityDomains(clause: string): string[] {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let uncommented = "";
  for (const char of clause) {
    if (escaped) {
      if (depth === 0) uncommented += char;
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      if (depth === 0) uncommented += char;
      escaped = true;
      continue;
    }
    if (quote) {
      if (depth === 0) uncommented += char;
      if (char === quote) quote = "";
      continue;
    }
    if (char === "\"" || char === "'") {
      if (depth === 0) uncommented += char;
      quote = char;
    } else if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0) uncommented += char;
  }
  const values = [...uncommented.matchAll(/\bheader\.(d|i)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s;()]+))/gi)]
    .map((match) => match[2] || match[3] || match[4] || "");
  return values.map((value) => normalizeDomain(value.split("@").pop() || "")).filter(Boolean);
}

function dkimPassesForDomain(
  headers: string | string[] | undefined,
  domain: string,
  configuredDomains: string[],
  configuredAuthservIds: string[]
): boolean {
  // Header arrays preserve wire order. The first Authentication-Results is the
  // receiver's result; later copies and ARC results are sender-controlled input.
  const raw = Array.isArray(headers) ? headers[0] : headers;
  if (!raw) return false;
  const header = String(raw).replace(/\r?\n[ \t]+/g, " ").trim();
  const trusted = configuredAuthservIds.length ? configuredAuthservIds : [...DEFAULT_TRUSTED_AUTH_SERV_IDS];
  const allowedAuthservIds = new Set(trusted.map(normalizeDomain).filter(Boolean));
  const clauses = header.split(";");
  if (!allowedAuthservIds.has(authservId(header))) return false;

  const passingAlignedClauses = clauses.slice(1).filter((clause) => {
    if (!/^\s*dkim\s*=\s*pass(?:\s|$)/i.test(clause)) return false;
    return identityDomains(clause).some((identity) =>
      identity === domain || (domain.endsWith(`.${identity}`) && isExplicitlyAllowedDomain(identity, configuredDomains))
    );
  });
  return passingAlignedClauses.length >= 1;
}

export function bankEmailDiagnostics(
  input: BankEmailInput,
  configuredDomains: string[] = [],
  trustedAuthservIds: string[] = [...DEFAULT_TRUSTED_AUTH_SERV_IDS]
) {
  const sender = parseSenderAddress(input.from);
  if (!sender) return { senderAddress: null, domainAllowed: false, dkimAligned: false };
  return {
    senderAddress: sender.address,
    domainAllowed: isAllowedDomain(sender.domain, configuredDomains),
    dkimAligned: dkimPassesForDomain(input.authenticationResults, sender.domain, configuredDomains, trustedAuthservIds)
  };
}

/** Email is accepted only when the parsed mailbox domain is trusted and aligned DKIM passed. */
export function parseBankEmail(
  input: BankEmailInput,
  configuredDomains: string[] = [],
  trustedAuthservIds: string[] = [...DEFAULT_TRUSTED_AUTH_SERV_IDS]
): ParsedBankCredit | null {
  const address = senderAddress(input.from);
  if (!address) return null;
  const domain = address.split("@").pop() || "";
  if (!isAllowedDomain(domain, configuredDomains)) return null;
  if (!dkimPassesForDomain(input.authenticationResults, domain, configuredDomains, trustedAuthservIds)) return null;

  const text = `${input.subject || ""}\n${input.text || ""}`.slice(0, 20000);
  if (NON_CREDIT.test(text) || !CREDIT_CUE.test(text)) return null;
  const amountPaise = findAmount(text);
  if (!amountPaise) return null;
  return { amountPaise, utr: findUtr(text), payerName: findPayer(text) };
}

export function parseSenderAddress(from: string): { address: string; domain: string } | null {
  const address = senderAddress(from);
  if (!address) return null;
  return { address, domain: address.split("@").pop() || "" };
}
