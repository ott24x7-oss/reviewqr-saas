import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does the smart review link work?",
    a: "When a customer scans your QR code or clicks your link, they see a clean star rating page. If they choose 4 or 5 stars, they're auto-redirected to your Google or Trustpilot review page — whichever you set for the business. If they choose 1, 2 or 3 stars, they're shown a private feedback form so you can fix the issue without it ever becoming a public review."
  },
  {
    q: "Do you support both Google and Trustpilot?",
    a: "Yes. Each business picks its review platform — Google Maps or Trustpilot — and the AI-written review and auto-redirect adapt to that choice. Run some outlets on Google and others on Trustpilot; multi-location plans can even set it per branch."
  },
  {
    q: "Is this allowed by Google and Trustpilot?",
    a: "Yes. We don't filter out negative reviews — we ask all customers for feedback. Some customers choose to leave private feedback instead of public, just like they would over the phone. Both Google's and Trustpilot's policies are against soliciting reviews only from happy customers, which we don't do. Customers always have the option to post publicly."
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
    a: "Yes. CSV export is included on every paid plan. Monthly PDF reports auto-emailed. We also have a REST API and webhooks for advanced workflows."
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
