import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
  description: "Why ReviewQR exists — helping Indian small businesses grow Google reviews and catch unhappy customers privately."
};

export default function AboutPage() {
  return (
    <LegalPage
      eyebrow="Our story"
      title="Built for Indian small businesses"
      intro="ReviewQR turns happy customers into public Google reviews — and routes unhappy ones into private feedback before they ever hit the internet."
    >
      <h2>Why we built ReviewQR</h2>
      <p>
        Great local businesses lose out for one simple reason: their happiest customers stay quiet, while
        the occasional unhappy one posts a public one-star review. A single QR code fixes both problems.
        Scan it, tap a star, and 4★+ customers are sent straight to your Google or Trustpilot review page
        while 1–3★ feedback lands privately in your dashboard so you can make it right.
      </p>

      <h2>What we believe</h2>
      <ul>
        <li><strong>Simple beats powerful.</strong> A shop owner should set this up in minutes, from a phone, with no training.</li>
        <li><strong>Feedback is a gift.</strong> Negative feedback handled privately builds a better business than a defensive public reply ever could.</li>
        <li><strong>Made for India.</strong> UPI-first billing, WhatsApp alerts, and pricing in rupees — not an afterthought bolted onto a US product.</li>
      </ul>

      <h2>Who it's for</h2>
      <p>
        Cafés, salons, clinics, retail stores, restaurants, gyms, and service businesses across India —
        anyone who meets customers in person and wants more (and better) Google &amp; Trustpilot reviews without chasing them.
      </p>

      <h2>Say hello</h2>
      <p>
        Questions, feedback, or partnership ideas? We'd love to hear from you — reach us any time and a
        real person will reply.
      </p>
    </LegalPage>
  );
}
