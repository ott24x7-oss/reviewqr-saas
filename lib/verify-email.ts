import { prisma } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { hashToken, randomToken } from "./tokens";
import { absoluteUrl } from "./utils";

const TTL_MS = 24 * 60 * 60 * 1000;

function identifier(userId: string) {
  return `verify-email:${userId}`;
}

export async function sendVerificationEmail(user: { id: string; email: string; name?: string | null }) {
  const token = randomToken();
  const expires = new Date(Date.now() + TTL_MS);
  await prisma.verificationToken.deleteMany({ where: { identifier: identifier(user.id) } });
  await prisma.verificationToken.create({
    data: { identifier: identifier(user.id), token: hashToken(token), expires }
  });
  const url = absoluteUrl(`/api/auth/verify-email?token=${token}`);
  await sendEmail({
    to: user.email,
    subject: "Confirm your ReviewQR email",
    html: `<p>Hi ${escapeHtml(user.name || "there")},</p><p>Confirm this email so we know the inbox is yours. You can keep using ReviewQR before you confirm.</p><p><a href="${escapeHtml(url)}">Confirm email</a></p><p>The link expires in 24 hours.</p>`
  });
}

export async function confirmVerificationToken(rawToken: string) {
  if (!rawToken) return { ok: false as const, error: "Missing token" };
  const token = hashToken(rawToken);
  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || !row.identifier.startsWith("verify-email:")) {
    return { ok: false as const, error: "This link is invalid." };
  }
  if (row.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return { ok: false as const, error: "This link has expired." };
  }
  const userId = row.identifier.slice("verify-email:".length);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.delete({ where: { token } })
  ]);
  return { ok: true as const };
}
