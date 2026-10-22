import crypto from "crypto";

function secret() {
  return process.env.NEXTAUTH_SECRET || "reviewqr-report";
}

export function reportToken(userId: string) {
  const sig = crypto.createHmac("sha256", secret()).update(`report|${userId}`).digest("hex").slice(0, 32);
  return `${userId}.${sig}`;
}

export function readReportToken(token: string) {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = reportToken(userId).slice(userId.length + 1);
  if (sig.length !== expected.length) return null;
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (!crypto.timingSafeEqual(left, right)) return null;
  return userId;
}
