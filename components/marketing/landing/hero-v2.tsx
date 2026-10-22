"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, Play, QrCode, Nfc, Smartphone, Clock, Languages, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Phone } from "./ui";
import { TapPageScreen, TAP_THEMES, OrderToast, AlertToast } from "./mockups";

/** Rail thumbnails keep the real gradient and drop the SVG grain filter, which is invisible at this size. */
function railBackground(background: string) {
  return background
    .replace(/url\("data:image\/svg\+xml,[^"]*"\)/g, "")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,\s*|\s*,\s*$/g, "");
}

const TRUST = [
  { icon: Smartphone, label: "No app for customers" },
  { icon: Clock, label: "Live in 10 minutes" },
  { icon: Languages, label: "Hindi + English" }
];

export function HeroV2() {
  const [t, setT] = React.useState(0);
  const rail = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const id = setInterval(() => setT((v) => (v + 1) % TAP_THEMES.length), 2600);
    return () => clearInterval(id);
  }, []);
  React.useEffect(() => {
    const row = rail.current;
    const card = row?.querySelector<HTMLElement>(`[data-theme="${t}"]`);
    if (!row || !card) return;
    const left = card.offsetLeft - (row.clientWidth - card.clientWidth) / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: "auto" });
  }, [t]);

  return (
    <section className="marketing-band marketing-hero relative overflow-hidden">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-12">
        {/* Copy first on every screen size */}
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary-800">
            <QrCode className="h-3.5 w-3.5" /> Scan
            <span className="text-muted-ink">or</span>
            <Nfc className="h-3.5 w-3.5" /> Tap
          </span>

          <h2 className="marketing-display mt-4 text-balance">
            One smart stand.{" "}
            <span className="bg-gradient-to-r from-primary-600 to-emerald-500 bg-clip-text text-transparent">
              Menu, orders &amp; reviews
            </span>{" "}
            in one tap.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-muted-ink text-pretty lg:mx-0">
            Put our QR + NFC stand on your counter. Customers scan or tap their phone to see your menu, order on
            WhatsApp, pay by UPI and review you on Google — while you get every order, review and customer in one
            dashboard.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-primary-800 lg:mx-0">
            स्कैन करो या टैप करो — मेन्यू, ऑर्डर, पेमेंट और रिव्यू, सब एक जगह।
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center lg:justify-start">
            <Button size="lg" variant="skeuo" asChild className="h-12 w-full sm:w-auto">
              <Link href="/register">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="neu" asChild className="h-12 w-full sm:w-auto">
              <Link href="/demo">
                <Play className="h-4 w-4" /> See live demo
              </Link>
            </Button>
          </div>

          <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-ink lg:justify-start">
            {TRUST.map((x) => (
              <li key={x.label} className="inline-flex items-center gap-1.5">
                <x.icon className="h-4 w-4 text-primary-600" /> {x.label}
              </li>
            ))}
            <li className="inline-flex items-center gap-1.5">
              <CircleCheck className="h-4 w-4 text-primary-600" /> Made in India
            </li>
          </ul>
        </div>

        {/* Visual */}
        <div className="relative mx-auto w-full max-w-[340px]">
          <Phone className="w-[280px] sm:w-[320px]">
            <TapPageScreen theme={TAP_THEMES[t]} />
          </Phone>
          <OrderToast className="absolute -left-1 top-24 hidden min-[400px]:flex sm:-left-16" />
          <AlertToast className="absolute -right-1 bottom-20 hidden min-[400px]:flex sm:-right-8" />
        </div>
      </div>
      <div ref={rail} className="theme-rail" aria-label="Theme previews">
        {TAP_THEMES.map((th, i) => (
          <button
            key={th.name}
            type="button"
            data-theme={i}
            onClick={() => setT(i)}
            aria-pressed={i === t}
            aria-label={`Show ${th.name} theme`}
            className="theme-card"
          >
            <span className="theme-card-art" style={{ background: railBackground(th.background) }} />
            <span className="theme-card-name">{th.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
