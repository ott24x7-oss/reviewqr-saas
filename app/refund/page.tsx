import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "How cancellations and refunds work for ReviewQR subscriptions."
};

export default function RefundPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund & Cancellation Policy"
      intro="Clear, fair rules for cancelling your subscription and requesting a refund."
      updated="2 August 2026"
    >
      <h2>1. Free plan</h2>
      <p>
        ReviewQR offers a free plan so you can evaluate the Service at no cost before paying. We encourage
        you to try it fully before upgrading to a paid plan.
      </p>

      <h2>2. Cancellations</h2>
      <p>
        You can cancel your subscription at any time from <strong>Dashboard → Billing</strong>. When you
        cancel, your plan remains active until the end of the current billing period, after which it will
        not renew and your account moves to the free plan. We do not charge any cancellation fee.
      </p>

      <h2>3. Refunds</h2>
      <ul>
        <li>
          <strong>7-day money-back guarantee:</strong> if you are not satisfied with a <em>first-time</em>
          paid subscription, contact us within 7 days of the charge for a full refund.
        </li>
        <li>
          <strong>Renewals:</strong> monthly renewals are generally non-refundable once the new period
          begins. If you were charged for a renewal you did not intend, contact us within 7 days and we
          will review it in good faith.
        </li>
        <li>
          <strong>Yearly plans:</strong> may be eligible for a pro-rated refund of the unused period at our
          discretion, less any period already used.
        </li>
      </ul>

      <h2>4. How to request a refund</h2>
      <p>
        Email us from your registered address using the contact email in the site footer, with your account
        email and the reason for the request. Approved refunds are processed back to your original payment
        method via our payment partner (Razorpay), typically within 5–7 business days.
      </p>

      <h2>5. Exceptions</h2>
      <p>
        Refunds may be declined in cases of policy abuse, fraud, or violations of our
        <a href="/terms"> Terms of Service</a>.
      </p>

      <h2>6. Contact</h2>
      <p>
        Need help with a charge or cancellation? Reach out any time — we aim to resolve billing questions
        quickly and fairly.
      </p>
    </LegalPage>
  );
}
