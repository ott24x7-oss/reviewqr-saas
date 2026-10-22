"use client";

import * as React from "react";
import Link from "next/link";
import { Phone } from "@/components/marketing/landing/ui";
import { TapPageScreen, WhatsAppOrderBubble } from "@/components/marketing/landing/mockups";
import { LandingPicture } from "./picture";
import { pick, useLandingLang } from "./lang";

const STEPS = [
  {
    id: "choose",
    image: "step-choose",
    en: "Choose a plan",
    hi: "प्लान चुनें",
    bodyEn: "Pick reviews, a menu, WhatsApp orders, a link page, or a combo.",
    bodyHi: "रिव्यू, मेनू, WhatsApp ऑर्डर, लिंक पेज या कॉम्बो चुनें।",
    altEn: "Three blank cards on a table, one slightly raised",
    altHi: "मेज़ पर तीन खाली कार्ड, बीच वाला थोड़ा उठा हुआ"
  },
  {
    id: "ship",
    image: "step-ship",
    en: "We print and ship your stand",
    hi: "हम स्टैंड छापकर भेजते हैं",
    bodyEn: "Order a QR + NFC stand, or download the QR and print it yourself.",
    bodyHi: "QR + NFC स्टैंड मँगवाएँ, या QR डाउनलोड करके खुद छापें।",
    altEn: "A kraft parcel beside an acrylic QR stand",
    altHi: "एक्रिलिक QR स्टैंड के पास एक पार्सल"
  },
  {
    id: "setup",
    image: "step-setup",
    en: "Set up your page in 10 minutes",
    hi: "10 मिनट में पेज सेट करें",
    bodyEn: "Add your name, menu, WhatsApp number, and review links.",
    bodyHi: "अपना नाम, मेनू, WhatsApp नंबर और रिव्यू लिंक जोड़ें।",
    altEn: "A phone on a café counter during setup",
    altHi: "सेटअप के दौरान कैफ़े काउंटर पर एक फ़ोन"
  },
  {
    id: "scan",
    image: "step-scan",
    en: "The customer scans or taps",
    hi: "ग्राहक स्कैन या टैप करता है",
    bodyEn: "Their own phone opens your page. They do not install an app.",
    bodyHi: "उनका अपना फ़ोन आपका पेज खोलता है। ऐप इंस्टॉल नहीं करना पड़ता।",
    altEn: "A hand holding a phone toward an acrylic stand",
    altHi: "एक्रिलिक स्टैंड की तरफ़ फ़ोन पकड़े एक हाथ"
  },
  {
    id: "results",
    image: "step-results",
    en: "Reviews, menu, WhatsApp orders",
    hi: "रिव्यू, मेनू, WhatsApp ऑर्डर",
    bodyEn: "They can review you, read the menu, and send an order on WhatsApp.",
    bodyHi: "वे रिव्यू दे सकते हैं, मेनू पढ़ सकते हैं, और WhatsApp पर ऑर्डर भेज सकते हैं।",
    altEn: "A star, a menu card, and a small dish on a counter",
    altHi: "काउंटर पर एक तारा, मेनू कार्ड और एक छोटी थाली"
  },
  {
    id: "track",
    image: "step-track",
    en: "You track it in the app",
    hi: "आप ऐप में सब देखते हैं",
    bodyEn: "Orders, reviews, and visits stay in your dashboard.",
    bodyHi: "ऑर्डर, रिव्यू और विज़िट आपके डैशबोर्ड में रहते हैं।",
    altEn: "A tablet showing an abstract dashboard",
    altHi: "एक टैबलेट जिस पर सादा डैशबोर्ड है"
  }
];

function BuyLink() {
  const { lang } = useLandingLang();
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <a href="/#pricing" className="marketing-cta inline-flex justify-center">
        {pick(lang, "Buy now", "अभी खरीदें")}
      </a>
      <Link href="/how-it-works#demo" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold underline">
        {pick(lang, "Watch the demo", "डेमो देखें")}
      </Link>
    </div>
  );
}

export function HowSteps() {
  const { lang } = useLandingLang();
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = root.current;
    if (!node) return;
    const items = [...node.querySelectorAll<HTMLElement>(".how-reveal")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      items.forEach((item) => item.classList.add("is-in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("is-in");
        }
      },
      { threshold: 0.2 }
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root}>
      <header className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-semibold tracking-[-0.03em]">
          {pick(lang, "How it works", "कैसे काम करता है")}
        </h1>
        <p className="mt-2 text-sm text-[var(--marketing-muted)]">
          {pick(
            lang,
            "Six steps from the plan to reviews, a menu, and WhatsApp orders.",
            "प्लान से रिव्यू, मेनू और WhatsApp ऑर्डर तक छह कदम।"
          )}
        </p>
      </header>
      <ol className="mx-auto mt-8 max-w-3xl space-y-8">
        {STEPS.map((step, index) => (
          <li key={step.id}>
            <article data-step={step.id} className="how-reveal grid items-center gap-4 sm:grid-cols-[160px_1fr]">
              <LandingPicture
                name={step.image}
                alt={lang === "hi" ? step.altHi : step.altEn}
                width={1200}
                height={1200}
                sizes="160px"
                className="aspect-square w-full rounded-[20px] object-cover sm:w-40"
              />
              <div>
                <p className="text-xs font-semibold text-[var(--marketing-muted)]">{index + 1}</p>
                <h2 className="mt-1 text-xl font-semibold">{lang === "hi" ? step.hi : step.en}</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--marketing-muted)]">
                  {lang === "hi" ? step.bodyHi : step.bodyEn}
                </p>
              </div>
            </article>
            {(index + 1) % 2 === 0 ? <BuyLink /> : null}
          </li>
        ))}
      </ol>

      <section id="demo" className="how-reveal mx-auto mt-12 max-w-3xl">
        <h2 className="text-xl font-semibold">{pick(lang, "Scan, tap, order", "स्कैन, टैप, ऑर्डर")}</h2>
        <p className="mt-1 text-sm text-[var(--marketing-muted)]">
          {pick(lang, "A short loop of the customer path.", "ग्राहक के रास्ते का छोटा लूप।")}
        </p>
        <div className="mt-4 flex justify-center">
          <Phone>
            <div className="how-cycle">
              <div className="how-pane flex items-center justify-center bg-[var(--marketing-sand)] p-6">
                <LandingPicture
                  name="step-scan"
                  alt={pick(lang, "Phone scanning a stand", "स्टैंड स्कैन करता फ़ोन")}
                  width={1200}
                  height={1200}
                  sizes="260px"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="how-pane">
                <TapPageScreen />
              </div>
              <div className="how-pane flex items-center justify-center bg-[#efeae2] p-4">
                <WhatsAppOrderBubble />
              </div>
            </div>
          </Phone>
        </div>
      </section>
    </div>
  );
}
