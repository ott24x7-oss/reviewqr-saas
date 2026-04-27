import Link from "next/link";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import {
  ScanLine,
  Star,
  ThumbsUp,
  Copy,
  ChevronRight,
  Bell,
  Sparkles,
  Smartphone,
  ExternalLink,
  ArrowRight
} from "lucide-react";

export const metadata = {
  title: "Live Demo · ReviewQR",
  description:
    "Scan the QR or use the live preview to see how ReviewQR turns happy customers into Google reviews — without lifting a finger."
};

const DEMO_QR_IMAGE = "https://i.ibb.co/Y7RWPMK5/QR-pay.png";
const DEMO_REVIEW_URL = "https://review.watshop.in/r/ensofter";

const steps = [
  {
    icon: ScanLine,
    title: "Customer scans the QR",
    body: "Print on table tents, billboards, bills, or business cards. They land on a mobile-first review page in under a second."
  },
  {
    icon: Star,
    title: "They tap a star to rate",
    body: "5-star review flow is two taps. The whole interaction is under 30 seconds — much higher conversion than a 'leave a review' link."
  },
  {
    icon: ThumbsUp,
    title: "Happy? Pick a ready-made review",
    body: "On 4–5★ we show 3 of your pre-loaded review variants. Each one is shown to a single customer only — so the reviews you actually receive on Google are unique and authentic."
  },
  {
    icon: Copy,
    title: "One tap → Copied + redirected",
    body: "We copy the chosen text to their clipboard and send them to your Google review form. They paste, hit post — done."
  },
  {
    icon: Bell,
    title: "You get a WhatsApp ping",
    body: "Owner gets an instant WhatsApp showing exactly what the customer copied — and any 1–3★ private feedback before it ever hits the public web."
  }
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-white">
      <MarketingNavbar />

      <section className="pt-28 pb-10 sm:pt-32 sm:pb-14 bg-gradient-to-b from-primary-50/40 via-white to-white">
        <div className="container max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-50 text-accent-700 text-sm font-medium">
            <Sparkles className="h-3.5 w-3.5" /> Live demo
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-display font-bold tracking-tight">
            See it on your phone <span className="gradient-text">right now</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Scan the QR below — or use the live embed underneath — to walk through the full
            customer flow. The demo is the same page your customers will get.
          </p>
        </div>
      </section>

      {/* QR Section */}
      <section className="py-10 sm:py-16">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary">
                Step 1 — Scan
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold">
                Point your camera at the QR
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Open the camera app on your phone and aim at the QR. You'll be taken to a real,
                fully working review page for our demo business —{" "}
                <span className="font-medium text-foreground">Ensofter Solutions</span>.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="h-3 w-3" />
                  </span>
                  <span>
                    Works on iPhone &amp; Android — no app install. Just the camera.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center shrink-0 mt-0.5">
                    <Star className="h-3 w-3" />
                  </span>
                  <span>
                    Try rating 5★ — see the &quot;Select your content&quot; modal pop up with
                    pre-loaded reviews.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center shrink-0 mt-0.5">
                    <ThumbsUp className="h-3 w-3" />
                  </span>
                  <span>
                    Try 1–2★ — see the private feedback path that protects your Google rating.
                  </span>
                </li>
              </ul>
              <div className="mt-6">
                <Button asChild variant="gradient" size="lg">
                  <Link href={DEMO_REVIEW_URL} target="_blank" rel="noopener noreferrer">
                    Open demo in a new tab <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="order-1 lg:order-2 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl gradient-brand opacity-10 blur-2xl" />
                <div className="relative rounded-3xl border bg-white shadow-card p-5 sm:p-7">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={DEMO_QR_IMAGE}
                    alt="Demo QR — scan to open the review page"
                    className="h-64 w-64 sm:h-80 sm:w-80 object-contain"
                  />
                  <div className="mt-3 text-center">
                    <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                      Scan to try
                    </div>
                    <div className="mt-1 text-sm font-semibold">Ensofter Solutions · Demo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live iframe section */}
      <section className="py-10 sm:py-16 bg-secondary/30 border-y">
        <div className="container max-w-5xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary">
              Step 2 — Or try it here
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold">
              The same page, embedded
            </h2>
            <p className="mt-3 text-muted-foreground">
              No phone handy? Click around in the live preview below — it's the actual review
              page, fully interactive.
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            {/* Phone-frame wrapper */}
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2.5rem] gradient-brand opacity-10 blur-2xl" />
              <div className="relative rounded-[2.5rem] bg-slate-900 p-3 shadow-2xl">
                <div className="rounded-[2rem] overflow-hidden bg-white relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 h-6 w-32 bg-slate-900 rounded-b-2xl" />
                  <iframe
                    src={DEMO_REVIEW_URL}
                    title="ReviewQR live demo"
                    className="block w-[340px] sm:w-[380px] h-[680px] sm:h-[720px] border-0"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Embedded preview of{" "}
            <a
              href={DEMO_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {DEMO_REVIEW_URL.replace(/^https?:\/\//, "")}
            </a>
          </p>
        </div>
      </section>

      {/* Guide section */}
      <section className="py-12 sm:py-20">
        <div className="container max-w-4xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
              How it works
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-display font-bold">
              From a QR scan to a real Google review
            </h2>
            <p className="mt-3 text-muted-foreground">
              Five steps end-to-end. Steps 1–4 happen in roughly 30 seconds on the customer's
              phone. Step 5 is automatic — for you.
            </p>
          </div>

          <ol className="mt-10 space-y-4">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="flex gap-4 sm:gap-5 rounded-2xl border bg-white p-5 sm:p-6 hover:shadow-card transition"
              >
                <div className="shrink-0">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl gradient-brand text-white flex items-center justify-center shadow-md">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white border text-[10px] font-bold flex items-center justify-center text-primary">
                      {i + 1}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden sm:block h-5 w-5 text-muted-foreground/50 self-center" />
                )}
              </li>
            ))}
          </ol>

          <div className="mt-12 rounded-2xl border-2 border-dashed border-primary/30 bg-primary-50/40 p-6 sm:p-8 text-center">
            <h3 className="text-xl sm:text-2xl font-display font-bold">
              Ready to try with your own business?
            </h3>
            <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
              Add your Google review URL, generate a QR for your counter, and start collecting
              reviews today. Free trial — no card needed.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="gradient" size="lg">
                <Link href="/register">
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/#pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
