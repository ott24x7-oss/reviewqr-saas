import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ReviewQR collects, uses, and protects your data."
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Your data belongs to you. This policy explains what we collect, why, and the choices you have."
      updated="2 August 2026"
    >
      <p>
        This Privacy Policy describes how ReviewQR ("we", "us", "the Service") collects, uses, and
        safeguards information when you use our website, dashboard, and review pages. By using the
        Service you agree to the practices described here.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address, and hashed password when you register.</li>
        <li><strong>Business data:</strong> business names, locations, staff names, logos, and Google review links you add.</li>
        <li><strong>Review &amp; feedback data:</strong> star ratings, written feedback, and optional contact details submitted by your customers.</li>
        <li><strong>Usage data:</strong> pages visited, device and browser type, and IP address, used for security and rate limiting.</li>
        <li><strong>Payment data:</strong> processed by our payment partner (Razorpay). We never store full card or bank details on our servers.</li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>To operate the Service — generating QR codes, routing reviews, and delivering dashboards.</li>
        <li>To send transactional alerts (e.g. negative-feedback notifications) by email or WhatsApp where you have configured them.</li>
        <li>To secure the platform, prevent spam and abuse, and enforce rate limits.</li>
        <li>To process subscriptions and issue invoices.</li>
      </ul>

      <h2>3. Sharing &amp; disclosure</h2>
      <p>
        We do not sell your data. We share information only with service providers who help us run the
        Service (hosting, payments, email/WhatsApp delivery), and only as needed. We may disclose data
        if required by law or to protect the rights and safety of users.
      </p>

      <h2>4. Data retention</h2>
      <p>
        We keep your data for as long as your account is active. You may request deletion of your account
        and associated data at any time by contacting us, subject to legal retention requirements.
      </p>

      <h2>5. Security</h2>
      <p>
        Passwords are hashed with bcrypt, inputs are validated and sanitised, and sensitive traffic is
        served over HTTPS. No system is perfectly secure, but we take reasonable measures to protect your
        information.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You can access, correct, export, or delete your data. To exercise any of these rights, contact us
        using the email listed in the site footer and we will respond within a reasonable time.
      </p>

      <h2>7. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be reflected by the "Last
        updated" date above.
      </p>
    </LegalPage>
  );
}
