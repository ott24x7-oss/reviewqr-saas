import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of ReviewQR."
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="These terms govern your access to and use of ReviewQR. Please read them carefully."
      updated="2 August 2026"
    >
      <p>
        By creating an account or using ReviewQR (the "Service"), you agree to these Terms of Service. If
        you do not agree, please do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        ReviewQR provides QR-code-based review collection, private feedback routing, analytics, and related
        tools for businesses. We may add, change, or remove features over time to improve the Service.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate information and keep your login credentials secure.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
        <li>You must be authorised to represent any business you add to the Service.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Incentivise, filter, or manipulate reviews in violation of Google's or any platform's policies.</li>
        <li>Submit unlawful, misleading, or abusive content.</li>
        <li>Attempt to breach, overload, or reverse-engineer the Service.</li>
        <li>Use the Service to spam or harass customers.</li>
      </ul>
      <p>
        <strong>Note on review platforms:</strong> ReviewQR helps you invite genuine feedback. You are
        responsible for using it in line with the terms of Google and any other review platform you link to.
      </p>

      <h2>4. Subscriptions &amp; billing</h2>
      <p>
        Paid plans are billed in advance on a monthly or yearly basis through our payment partner. Prices
        are listed in Indian Rupees and may be revised with notice. Your subscription renews automatically
        unless cancelled before the renewal date. Refunds are governed by our <a href="/refund">Refund Policy</a>.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        The Service, its software, and branding are owned by us. You retain ownership of the content and
        data you submit, and grant us the licence needed to operate the Service on your behalf.
      </p>

      <h2>6. Availability &amp; liability</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by
        law, we are not liable for indirect or consequential damages, and our total liability is limited to
        the fees you paid in the preceding three months.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may cancel at any time from your billing settings. We may suspend or terminate accounts that
        violate these terms. On termination, your right to use the Service ends immediately.
      </p>

      <h2>8. Governing law</h2>
      <p>
        These terms are governed by the laws of India, and any disputes are subject to the exclusive
        jurisdiction of the courts of Bengaluru, Karnataka.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these terms? Contact us using the email in the site footer.
      </p>
    </LegalPage>
  );
}
