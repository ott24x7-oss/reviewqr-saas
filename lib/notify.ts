/**
 * High-level notification dispatcher. Used when negative feedback is
 * submitted: emails the business owner and (if configured) sends a
 * WhatsApp ping.
 */
import { prisma } from "./db";
import { sendEmail, negativeFeedbackEmail } from "./email";
import { sendWhatsApp, renderTemplate } from "./whatsapp";
import { absoluteUrl } from "./utils";

export async function notifyNegativeFeedback(opts: {
  businessId: string;
  reviewId: string;
  rating: number;
  message: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}) {
  const business = await prisma.business.findUnique({
    where: { id: opts.businessId },
    include: { owner: true }
  });
  if (!business) return;

  const dashboardUrl = absoluteUrl(`/dashboard/${business.slug}/feedback/${opts.reviewId}`);

  // Email alert
  if (business.email || business.owner.email) {
    const html = negativeFeedbackEmail({
      businessName: business.name,
      rating: opts.rating,
      message: opts.message,
      customerName: opts.customerName,
      customerPhone: opts.customerPhone,
      customerEmail: opts.customerEmail,
      dashboardUrl
    });
    sendEmail({
      to: business.email || business.owner.email,
      subject: `⚠️ ${opts.rating}-star feedback at ${business.name}`,
      html
    }).catch((e) => console.error("[notify] email failed:", e.message));
  }

  // WhatsApp alert (optional)
  if (business.whatsappNumber) {
    const message = renderTemplate(
      `⚠️ Negative feedback at *{{businessName}}*\n\n{{stars}} ({{rating}}/5)\n\n"{{msg}}"\n\n{{customer}}\n\nReply: {{url}}`,
      {
        businessName: business.name,
        stars: "⭐".repeat(opts.rating) + "☆".repeat(5 - opts.rating),
        rating: opts.rating,
        msg: opts.message.slice(0, 250),
        customer: opts.customerName ? `From: ${opts.customerName}` : "",
        url: dashboardUrl
      }
    );
    sendWhatsApp({ to: business.whatsappNumber, message }).catch((e) =>
      console.error("[notify] whatsapp failed:", e.message)
    );
  }

  // In-app notification
  await prisma.notification.create({
    data: {
      userId: business.ownerId,
      type: "negative_feedback",
      title: `New ${opts.rating}-star feedback`,
      message: opts.message.slice(0, 200),
      link: `/dashboard/${business.slug}/feedback/${opts.reviewId}`,
      metadata: { rating: opts.rating, businessId: business.id }
    }
  });
}
