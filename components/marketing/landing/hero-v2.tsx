"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, Play, QrCode, Nfc, Smartphone, Clock, Languages, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Phone } from "./ui";
import { TapPageScreen, TAP_THEMES, OrderToast, AlertToast } from "./mockups";

const TRUST = [
  { icon: Smartphone, label: "No app for customers" },
  { icon: Clock, label: "Live in 10 minutes" },
  { icon: Languages, label: "Hindi + English" }
];

export function HeroV2() {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setT((v) => (v + 1) % TAP_THEMES.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] neu">
      <div
        aria-hidden
        className="absolute -top-32 left-1/2 -z-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary-200/60 via-emerald-100/40 to-sky-200/50 blur-3xl"
      />
      <div className="relative grid items-center gap-10 px-4 pb-12 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-6 lg:px-12 lg:pb-16 lg:pt-16">
        {/* Copy first on every screen size */}
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary-800">
            <QrCode className="h-3.5 w-3.5" /> Scan
            <span className="text-slate-300">or</span>
            <Nfc className="h-3.5 w-3.5" /> Tap
          </span>

          <h1 className="marketing-display mt-4 text-balance">
            One smart stand.{" "}
            <span className="bg-gradient-to-r from-primary-600 to-emerald-500 bg-clip-text text-transparent">
              Menu, orders &amp; reviews
            </span>{" "}
            in one tap.
          </h1>

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
        <div className="relative mx-auto w-full max-w-[360px]">
          <Phone>
            <TapPageScreen theme={TAP_THEMES[t]} />
          </Phone>
          <OrderToast className="absolute -left-1 top-24 hidden min-[400px]:flex sm:-left-24" />
          <AlertToast className="absolute -right-1 bottom-20 hidden min-[400px]:flex sm:-right-12" />
          <div className="mt-4 flex items-center justify-center gap-2" aria-label="Theme previews">
            {TAP_THEMES.map((th, i) => (
              <button
                key={th.name}
                type="button"
                onClick={() => setT(i)}
                aria-label={`Show ${th.name} theme`}
                className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-[#eef1f6] transition ${th.bg} ${
                  i === t ? "ring-primary-500" : "ring-transparent"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-ink">Tap a colour to preview themes</p>
        </div>
      </div>
    </section>
  );
}
