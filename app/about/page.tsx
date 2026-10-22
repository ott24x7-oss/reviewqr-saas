import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
  description: "Why QR24x7 exists — a public review link for every customer, and a private note for the owner."
};

export default function AboutPage() {
  return (
    <LegalPage
      eyebrow="Our story"
      title="Built for Indian small businesses"
      intro="QR24x7 shows every customer a public review link and a private note, on the same screen and in the same order."
    >
      <h2>Why we built QR24x7</h2>
      <p>
        A customer who had a good visit often leaves without posting, and a customer who had a bad one
        may only say so in public. One QR gives every customer both choices. Whatever star they tap,
        they see the Google or Trustpilot link and a private form. A low rating with a written note
        alerts the owner, and the public link stays on that same screen.
      </p>

      <h2>What we believe</h2>
      <ul>
        <li><strong>Simple beats powerful.</strong> A shop owner should set this up in minutes, from a phone, with no training.</li>
        <li><strong>Feedback is a gift.</strong> A private note helps you fix a visit. It is never a reason to hide the public review link, or to offer a reward for posting one.</li>
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
