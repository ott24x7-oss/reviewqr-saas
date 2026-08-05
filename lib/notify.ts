/**
 * High-level notification dispatcher. Used when negative feedback is
 * submitted: emails the business owner and (if configured) sends a
 * WhatsApp ping.
 */
import { prisma } from "./db";
import { sendEmail, negativeFeedbackEmail } from "./email";
import { sendWhatsApp, renderTemplate } from "./whatsapp";
import { absoluteUrl } from "./utils";
import { getWhatsAppConfig } from "./settings";

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

  const dashboardUrl = absoluteUrl(`/dashboard/feedback`);

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
      link: `/dashboard/feedback`,
      metadata: { rating: opts.rating, businessId: business.id }
    }
  });
}

/**
 * Fired when a happy customer claims one of the owner's pre-written
 * review templates and gets redirected to Google. Lets the owner know
 * exactly what text the customer is about to paste.
 */
export async function notifyPositiveReviewCopy(opts: {
  businessId: string;
  templateContent: string;
  rating?: number;
}) {
  const cfg = await getWhatsAppConfig();
  if (!cfg.notifyPositiveCopy) return;

  const business = await prisma.business.findUnique({
    where: { id: opts.businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      whatsappNumber: true,
      ownerId: true
    }
  });
  if (!business?.whatsappNumber) return;

  const message = renderTemplate(
    `🌟 New positive review on its way for *{{businessName}}*\n\n` +
      `{{stars}}\n\nA customer just copied this to paste on Google:\n\n"{{content}}"\n\n` +
      `_Sent by ReviewQR_`,
    {
      businessName: business.name,
      stars: "⭐".repeat(opts.rating || 5),
      content: opts.templateContent.slice(0, 500)
    }
  );

  sendWhatsApp({ to: business.whatsappNumber, message }).catch((e) =>
    console.error("[notify] positive copy whatsapp failed:", e.message)
  );

  // Light in-app notification too
  prisma.notification
    .create({
      data: {
        userId: business.ownerId,
        type: "positive_review_copy",
        title: "Customer copied a review for Google",
        message: opts.templateContent.slice(0, 200),
        link: `/dashboard/businesses/${business.id}/review-templates`,
        metadata: { businessId: business.id }
      }
    })
    .catch(() => {});
}
