import { prisma } from "../db";
import { sendEmail } from "../email";
import { sendWhatsApp } from "../whatsapp";

/** WhatsApp first. A click-to-chat link is not delivery, so email is the fallback. */
export async function notifyUser(userId: string, subject: string, message: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, email: true }
  });
  if (!user) return;
  let delivered = false;
  if (user.phone) {
    try {
      const sent = await sendWhatsApp({ to: user.phone, message });
      delivered = sent.via !== "click-to-chat";
    } catch {
      delivered = false;
    }
  }
  if (!delivered && user.email && !user.email.endsWith("@users.reviewqr.local")) {
    await sendEmail({ to: user.email, subject, html: `<p>${message}</p>` }).catch(() => undefined);
  }
}
