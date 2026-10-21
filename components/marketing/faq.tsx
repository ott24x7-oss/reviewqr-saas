import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does the smart review link work?",
    a: "A customer scans your QR or opens your link and taps a star. Every rating then shows the public review link and a private form, in that order, with the same buttons. They can open Google or Trustpilot themselves, and they can also send the owner a private note. Nothing is posted for them."
  },
  {
    q: "Do you support both Google and Trustpilot?",
    a: "Yes. Each business can save a Google link and a Trustpilot link. The one you prefer is listed first, and both stay visible. A branch can have its own Google link."
  },
  {
    q: "Is this allowed by Google and Trustpilot?",
    a: "Yes. Every customer sees the public review link, whatever star they tap. They can also send a private note. We do not hide that link from lower ratings, and we do not offer a reward, coupon, or stamp for a public review. If AI is on, it only tidies words the customer already wrote. They can edit that suggestion and copy it themselves."
  },
  {
    q: "Do my customers need to install an app?",
    a: "No. They scan the QR with their phone camera — it opens a mobile-optimised web page. The whole flow takes 15 seconds."
  },
  {
    q: "Can I have multiple branches and locations?",
    a: "Yes — Growth and Agency plans support multiple businesses, locations, and even staff-wise links. Each branch can have its own Google or Trustpilot review URL."
  },
  {
    q: "How does WhatsApp integration work?",
    a: "Two options. (1) Click-to-chat — works without any setup, you click 'Send' on your phone. (2) WhatsApp Cloud API — fully automated, requires a Meta Business verification. Both come standard."
  },
  {
    q: "How do I pay for a plan?",
    a: "We're built India-first. Pay by UPI in INR, or with USDT (crypto) if you're overseas. Payments are auto-verified from the transaction email, so your plan activates within minutes — no card on file."
  },
  {
    q: "Can I white-label this for my agency clients?",
    a: "Absolutely — that's the Agency plan. Your logo, your domain, your colours. Your clients never see ReviewQR branding."
  },
  {
    q: "What happens after my free trial?",
    a: "You stay on the Free plan automatically. No card on file, no surprise charges. Upgrade only when you're ready."
  },
  {
    q: "Can I export my data?",
    a: "Yes. CSV export is included on every paid plan. Monthly PDF reports auto-emailed."
  },
  {
    q: "Is my data safe?",
    a: "Yes. Hosted on Indian-friendly infrastructure with daily backups. Passwords are bcrypt-hashed. All forms are CSRF-protected and rate-limited. We never share your customer data."
  }
];

export function FAQ() {
  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="container max-w-3xl">
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
            FAQ
          </span>
          <h2 className="section-title mt-4 font-display">
            Frequently asked <span className="gradient-text">questions</span>
          </h2>
          <p className="section-sub mt-4">
            Can't find what you're looking for?{" "}
            <a href="mailto:hello@reviewqr.in" className="text-primary font-medium hover:underline">
              Email us
            </a>
            .
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="neu rounded-2xl border-b-0 px-5 mb-3">
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
