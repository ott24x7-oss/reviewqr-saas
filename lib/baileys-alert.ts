import { logAudit } from "./admin";
import { prisma } from "./db";
import { sendEmail } from "./email";
import { queueAdminPush } from "./admin/push";
import { rateLimitDb } from "./rate-limit";

/** Record a dropped Baileys session and email admins at most once an hour. */
export async function noteBaileysDown(reason: string) {
  try {
    await logAudit({
      action: "whatsapp.baileys.disconnect",
      entity: "whatsapp",
      metadata: { reason }
    });
    void queueAdminPush({
      event: "whatsappDown",
      collapseKey: "sender",
      title: "WhatsApp disconnected",
      body: "The sender needs to be paired again.",
      windowSeconds: 3600
    });
    const gate = await rateLimitDb({
      key: "baileys-disconnect-mail",
      limit: 1,
      windowSeconds: 3600
    });
    if (!gate.ok) return;

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", deletedAt: null },
      select: { email: true }
    });
    const extra = process.env.ADMIN_EMAIL?.trim();
    const to = [...new Set([...admins.map((row) => row.email), extra].filter((value): value is string => !!value))];
    if (!to.length) return;

    await sendEmail({
      to,
      subject: "QR24x7 WhatsApp session disconnected",
      html: `<p>The Baileys WhatsApp session is ${reason}. Login codes will use WhatsApp Cloud, then email, until you reconnect in Admin → WhatsApp.</p>`
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.warn("[baileys] disconnect alert failed:", message);
  }
}
