import { prisma } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { rateLimitDb } from "@/lib/rate-limit";

const WEEK_SECONDS = 7 * 24 * 60 * 60;

/** One in-app notice and one email per owner per 7 days. */
export async function remindExpiredOwner(ownerId: string, businessName: string) {
  const gate = await rateLimitDb({
    key: `tap-expired:${ownerId}`,
    limit: 1,
    windowSeconds: WEEK_SECONDS
  });
  if (!gate.ok) return;

  const name = businessName.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 120) || "Your page";
  await prisma.notification.create({
    data: {
      userId: ownerId,
      type: "tap_expired",
      title: "Your customer page is limited",
      message: `${name} is showing only the name, phone, and directions until the plan is renewed.`,
      link: "/dashboard/billing"
    }
  });

  const user = await prisma.user.findUnique({ where: { id: ownerId }, select: { email: true } });
  if (!user?.email) return;
  const safe = escapeHtml(name);
  const billing = `${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/dashboard/billing`;
  await sendEmail({
    to: user.email,
    subject: "Your QR24x7 page is limited",
    html: `<p>${safe} is showing only the name, phone, and directions until you renew.</p><p><a href="${escapeHtml(billing)}">Open billing</a></p>`,
    text: `${name} is showing only the name, phone, and directions until you renew. ${billing}`
  }).catch(() => {});
}
