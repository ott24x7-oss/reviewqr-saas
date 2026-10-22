"use client";

import Link from "next/link";
import { Phone } from "@/components/marketing/landing/ui";
import { TapPageScreen } from "@/components/marketing/landing/mockups";
import type { LandingQuote } from "@/lib/landing/proof";
import { LandingPicture } from "./picture";
import { pick, useLandingLang } from "./lang";

const CASES = [
  {
    image: "use-cafe",
    en: "Café",
    hi: "कैफ़े",
    bodyEn: "Menu on the table, orders on WhatsApp, reviews before they leave.",
    bodyHi: "मेज़ पर मेनू, WhatsApp पर ऑर्डर, जाने से पहले रिव्यू।",
    altEn: "Acrylic stand on an Indian café counter",
    altHi: "भारतीय कैफ़े काउंटर पर एक्रिलिक स्टैंड"
  },
  {
    image: "use-salon",
    en: "Salon",
    hi: "सैलून",
    bodyEn: "One page for services, booking links, and a review ask.",
    bodyHi: "सर्विस, बुकिंग लिंक और रिव्यू के लिए एक पेज।",
    altEn: "Salon counter with towels and a stand",
    altHi: "तौलिये और स्टैंड के साथ सैलून काउंटर"
  },
  {
    image: "use-shop",
    en: "Shop",
    hi: "दुकान",
    bodyEn: "A kirana or clothing counter can take WhatsApp orders without a commission.",
    bodyHi: "किराना या कपड़े की दुकान बिना कमीशन के WhatsApp ऑर्डर ले सकती है।",
    altEn: "Kirana counter with jars and a stand",
    altHi: "जार और स्टैंड के साथ किराना काउंटर"
  },
  {
    image: "use-clinic",
    en: "Clinic",
    hi: "क्लिनिक",
    bodyEn: "A quiet page for hours, directions, and private feedback.",
    bodyHi: "समय, रास्ता और निजी फ़ीडबैक के लिए एक शांत पेज।",
    altEn: "Clinic reception desk with a plant and a stand",
    altHi: "पौधे और स्टैंड के साथ क्लिनिक रिसेप्शन"
  }
];

export function LiveDemo() {
  const { lang } = useLandingLang();
  return (
    <section id="live" className="px-4 py-10">
      <div className="mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.03em]">
            {pick(lang, "See it live", "लाइव देखें")}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--marketing-muted)]">
            {pick(
              lang,
              "This is the tap page a customer opens. No app. Menu, links, and a review button.",
              "यह वही टैप पेज है जो ग्राहक खोलता है। कोई ऐप नहीं। मेनू, लिंक और रिव्यू बटन।"
            )}
          </p>
          <Link href="/demo" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline">
            {pick(lang, "Open the live demo", "लाइव डेमो खोलें")}
          </Link>
        </div>
        <Phone>
          <TapPageScreen />
        </Phone>
      </div>
    </section>
  );
}

export function UseCases() {
  const { lang } = useLandingLang();
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.03em]">
          {pick(lang, "Made for the counter you already have", "उसी काउंटर के लिए जो आपके पास है")}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CASES.map((item) => (
            <article key={item.image} className="min-w-0 overflow-hidden rounded-[20px] border border-[var(--marketing-line)] bg-white/70">
              <LandingPicture
                name={item.image}
                alt={lang === "hi" ? item.altHi : item.altEn}
                width={1200}
                height={800}
                sizes="(max-width: 1023px) 50vw, 25vw"
                className="aspect-[3/2] w-full object-cover"
              />
              <div className="p-3">
                <h3 className="text-sm font-semibold">{lang === "hi" ? item.hi : item.en}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--marketing-muted)]">
                  {lang === "hi" ? item.bodyHi : item.bodyEn}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowTeaser() {
  const { lang } = useLandingLang();
  return (
    <section className="px-4 py-10">
      <div className="mx-auto grid max-w-6xl items-center gap-6 rounded-[24px] border border-[var(--marketing-line)] bg-white/60 p-4 sm:grid-cols-[1fr_220px] sm:p-6">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.03em]">
            {pick(lang, "Up and running the same day", "उसी दिन शुरू")}
          </h2>
          <ol className="mt-3 space-y-1 text-sm text-[var(--marketing-muted)]">
            <li>{pick(lang, "1. Choose a plan", "1. प्लान चुनें")}</li>
            <li>{pick(lang, "2. We ship the stand, or you download the QR", "2. हम स्टैंड भेजते हैं, या आप QR डाउनलोड करते हैं")}</li>
            <li>{pick(lang, "3. Customers scan, you track it", "3. ग्राहक स्कैन करें, आप सब देखें")}</li>
          </ol>
          <Link href="/how-it-works" className="marketing-cta mt-4 inline-flex justify-center">
            {pick(lang, "See how it works", "कैसे काम करता है")}
          </Link>
        </div>
        <LandingPicture
          name="step-scan"
          alt={pick(lang, "Customer scanning a stand", "स्टैंड स्कैन करता ग्राहक")}
          width={1200}
          height={1200}
          sizes="220px"
          className="aspect-square w-full rounded-[20px] object-cover"
        />
      </div>
    </section>
  );
}

export function RealTestimonials({ quotes }: { quotes: LandingQuote[] }) {
  const { lang } = useLandingLang();
  if (!quotes.length) return null;
  return (
    <section id="stories" className="px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.03em]">
          {pick(lang, "From businesses using it", "इस्तेमाल कर रहे बिज़नेस से")}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((quote) => (
            <figure key={quote.id} className="rounded-[20px] border border-[var(--marketing-line)] bg-white/70 p-4">
              <blockquote className="text-sm leading-relaxed">{quote.message}</blockquote>
              <figcaption className="mt-3 text-xs font-semibold">
                {quote.authorName}
                {quote.authorRole ? <span className="font-normal text-[var(--marketing-muted)]"> · {quote.authorRole}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
