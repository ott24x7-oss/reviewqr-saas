import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How QR24x7 collects, uses, and protects your data."
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Your data belongs to you. This policy explains what we collect, why, and the choices you have."
      updated="22 October 2026"
    >
      <p>
        This Privacy Policy describes how QR24x7 ("we", "us", "the Service") collects, uses, and
        safeguards information when you use our website, dashboard, and review pages. By using the
        Service you agree to the practices described here.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address, mobile number, and hashed password when you register or sign in with a one-time code.</li>
        <li><strong>Business data:</strong> business names, locations, staff names, logos, and Google review links you add.</li>
        <li><strong>Review &amp; feedback data:</strong> star ratings and written feedback. Name, mobile, and email are stored only when the customer ticks the consent box on the review form.</li>
        <li><strong>Usage data:</strong> pages visited, device type, and a hashed IP address used to count QR scans and limit abuse. The scan hash cannot be turned back into an IP address.</li>
        <li><strong>Payment data:</strong> plan checkouts go through our self-hosted YouPI gateway or a manual UPI or USDT transfer. We store the amount, status, UTR when we have one, and the GST invoice. We do not store card numbers.</li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>To operate the Service — generating QR codes, showing the public review link, storing private feedback, and delivering dashboards.</li>
        <li>To send transactional alerts (for example when private feedback is not a positive rating) by email or WhatsApp where you have configured them.</li>
        <li>To secure the platform, prevent spam and abuse, and enforce rate limits.</li>
        <li>To process subscriptions and issue invoices.</li>
      </ul>

      <h2>3. Sharing &amp; disclosure</h2>
      <p>
        We do not sell your data. We share information only with service providers who help us run the
        Service (hosting, payments, email/WhatsApp delivery), and only as needed. We may disclose data
        if required by law or to protect the rights and safety of users.
      </p>

      <h2>4. Consent</h2>
      <p>
        The public review form explains what is collected, that only the business owner sees a private
        complaint, and how to ask for deletion. A customer can submit a rating without sharing contact
        details. Contact details are saved only after they tick the consent box, and the time of that
        choice is stored with the review.
      </p>

      <h2>5. Data retention, export, and deletion</h2>
      <p>
        Signed-in owners can download a JSON copy of their account, businesses, reviews, and feedback
        from Settings. Deleting the account removes the businesses, reviews, feedback, and profile
        details, and replaces the login email so the account cannot be used again. Payment rows and GST
        invoices are kept. Indian tax rules require us to retain those records. The invoice is a snapshot
        taken when it was issued, so later changes to the profile do not rewrite it.
      </p>
      <p>
        A business owner can erase a customer's name, email, and phone from a feedback row. That action
        is written to the audit log.
      </p>
      <p>
        You can delete the account in the Android app under More, or on the web at the{" "}
        <a href="/account/delete" className="underline">
          account deletion page
        </a>
        . That page asks for a one-time code sent to the mobile number on the account. The invoice
        exception above still applies.
      </p>

      <h2>6. Security</h2>
      <p>
        Passwords are hashed with bcrypt, inputs are validated and sanitised, and sensitive traffic is
        served over HTTPS. No system is perfectly secure, but we take reasonable measures to protect your
        information.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Under the Digital Personal Data Protection Act, 2023, you can access, correct, export, or ask us
        to erase your personal data. Use Settings while signed in, or contact the email in the site
        footer. Tax invoices are the exception described above.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be reflected by the "Last
        updated" date above.
      </p>
    </LegalPage>
  );
}
