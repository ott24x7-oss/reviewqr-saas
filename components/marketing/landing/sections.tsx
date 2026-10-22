import Link from "next/link";
import {
  ArrowRight,
  Utensils,
  Coffee,
  Scissors,
  Stethoscope,
  Dumbbell,
  Store,
  Hotel,
  ShoppingBag,
  Star,
  QrCode,
  Nfc,
  ChartColumn,
  Sparkles,
  Palette,
  UsersRound,
  Gift,
  BellRing,
  Printer,
  Truck,
  Search,
  Check,
  X,
  IndianRupee,
  MessageCircle,
  Languages
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { SectionShell, SectionHeading, SoonBadge, Phone } from "./ui";
import { StoreScreen, WhatsAppOrderBubble, ReviewScreen, AlertToast, TapPageScreen, TAP_THEMES } from "./mockups";
import type { Module } from "./features-status";

/* ─────────────────── 1. Product suite ─────────────────── */
const SUITE: { icon: any; title: string; body: string; module: Module; tone: string }[] = [
  {
    icon: Sparkles,
    title: "Smart profile page",
    body: "A Linktree-style page for your business: menu, reviews, WhatsApp, call, map, UPI, Wi-Fi and any link you want.",
    module: "tapPage",
    tone: "bg-violet-50 text-violet-600"
  },
  {
    icon: ShoppingBag,
    title: "WhatsApp store",
    body: "Your menu or catalogue with photos and a cart. Orders land straight in your WhatsApp. 0% commission.",
    module: "whatsappStore",
    tone: "bg-emerald-50 text-emerald-600"
  },
  {
    icon: Star,
    title: "Google reviews",
    body: "Every star shows the public Google or Trustpilot link. AI only tidies words the customer already wrote. They post it themselves.",
    module: "reviews",
    tone: "bg-amber-50 text-amber-600"
  },
  {
    icon: BellRing,
    title: "Private feedback alerts",
    body: "Any customer can also send a private note on the same screen. A low rating with a message alerts you on WhatsApp and email.",
    module: "alerts",
    tone: "bg-rose-50 text-rose-600"
  },
  {
    icon: Nfc,
    title: "QR + NFC stands",
    body: "Premium acrylic stands, PVC cards and table stickers — printed with your brand and delivered to your door.",
    module: "nfc",
    tone: "bg-sky-50 text-sky-600"
  },
  {
    icon: ChartColumn,
    title: "Dashboard & customer list",
    body: "Scans, taps, orders, reviews and a customer list that builds itself — on your phone, every day.",
    module: "dashboard",
    tone: "bg-indigo-50 text-indigo-600"
  }
];

export function ProductSuite() {
  return (
    <SectionShell id="features">
      <SectionHeading
        eyebrow="Everything in one tap"
        title="Not just a QR sticker. A complete digital counter for your shop."
        sub="Six tools that usually cost six subscriptions — working together from one stand on your counter."
      />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {SUITE.map((f) => (
          <div key={f.title} className="rounded-2xl bg-white/80 p-5 ring-1 ring-white shadow-[0_6px_20px_-12px_rgba(30,41,59,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", f.tone)}>
                <f.icon className="h-5 w-5" />
              </span>
              <SoonBadge module={f.module} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-ink">{f.body}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────────────── 2. How it works ─────────────────── */
const STEPS = [
  {
    icon: Search,
    title: "Sign up & find your shop",
    body: "Search your business name — we pull your Google details and review link automatically."
  },
  {
    icon: Palette,
    title: "Pick a theme & add links",
    body: "Upload your logo, choose a theme, add your menu, WhatsApp and payment details."
  },
  {
    icon: Truck,
    title: "Get your stand delivered",
    body: "Order a QR stand or NFC combo. We print, program and ship it across India."
  },
  {
    icon: QrCode,
    title: "Customers scan or tap",
    body: "They order, pay, review and follow you. You watch it all grow on your dashboard."
  }
];

export function HowItWorksV2() {
  return (
    <SectionShell id="how">
      <SectionHeading
        eyebrow="How it works"
        title="Live in 10 minutes. No tech skills needed."
        sub="If you can use WhatsApp, you can run your shop's digital counter."
      />
      <ol className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl bg-white/80 p-5 ring-1 ring-white">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-grad-brand text-sm font-bold text-white shadow-glow">
                {i + 1}
              </span>
              <s.icon className="h-5 w-5 text-primary-700" />
            </div>
            <h3 className="mt-4 font-bold text-ink">{s.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-ink">{s.body}</p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

/* ─────────────────── 3. Showcases ─────────────────── */
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm sm:text-base text-ink/80">
      <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
      <span>{children}</span>
    </li>
  );
}

function Showcase({
  id,
  eyebrow,
  module,
  title,
  sub,
  bullets,
  visual,
  flip
}: {
  id?: string;
  eyebrow: string;
  module: Module;
  title: string;
  sub: string;
  bullets: string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <SectionShell id={id}>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className={cn(flip && "lg:order-2")}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-800">
              {eyebrow}
            </span>
            <SoonBadge module={module} />
          </div>
          <h2 className="mt-3 text-[1.75rem] leading-tight sm:text-4xl font-bold tracking-tight text-ink text-balance">{title}</h2>
          <p className="mt-3 text-base sm:text-lg text-muted-ink text-pretty">{sub}</p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <Bullet key={b}>{b}</Bullet>
            ))}
          </ul>
        </div>
        <div className={cn("relative", flip && "lg:order-1")}>{visual}</div>
      </div>
    </SectionShell>
  );
}

export function TapPageShowcase() {
  return (
    <Showcase
      id="profile"
      eyebrow="Smart profile page"
      module="tapPage"
      title="Your shop's own link-in-bio page — beautifully themed."
      sub="One link for everything. Change links any time from your phone; the printed QR and NFC never change."
      bullets={[
        "Unlimited buttons: menu, Google, Trustpilot, Zomato, Instagram, call, directions, UPI, Wi-Fi or any custom link",
        "20 graphic themes, six of them on paid plans, or build your own with your logo, colours, fonts and background",
        "Drag to reorder, hide or schedule links — live preview while you edit",
        "Hindi and English, loads instantly even on slow 3G"
      ]}
      visual={
        <div className="flex items-end justify-center gap-3 sm:gap-4">
          <div className="hidden min-[420px]:block origin-bottom scale-[0.82] opacity-90">
            <Phone className="w-[220px] sm:w-[240px]">
              <TapPageScreen theme={TAP_THEMES[1]} />
            </Phone>
          </div>
          <Phone>
            <TapPageScreen theme={TAP_THEMES[2]} />
          </Phone>
        </div>
      }
    />
  );
}

export function StoreShowcase() {
  return (
    <Showcase
      id="store"
      eyebrow="WhatsApp store"
      module="whatsappStore"
      flip
      title="Take orders on WhatsApp. Pay zero commission."
      sub="Customers browse your menu, add to cart and send the order to your WhatsApp in one tap — with the total and a UPI payment link."
      bullets={[
        "Photos, prices, veg/non-veg, variants and add-ons — set up in minutes, or let AI read your paper menu",
        "Dine-in with table number, takeaway or home delivery with charges and minimum order",
        "Live orders screen, order status for customers and one-tap reorder",
        "Works for restaurants, kirana, bakeries, boutiques, salons and more"
      ]}
      visual={
        <div className="relative mx-auto max-w-[360px]">
          <Phone>
            <StoreScreen />
          </Phone>
          <WhatsAppOrderBubble className="absolute -right-1 bottom-6 hidden min-[400px]:block sm:-right-16" />
        </div>
      }
    />
  );
}

export function ReviewsShowcase() {
  return (
    <Showcase
      id="reviews"
      eyebrow="Reviews & feedback"
      module="reviews"
      title="More Google reviews. Fewer surprises."
      sub="Every star shows the public review link and a private note, in the same order. A low rating with a message alerts you so you can follow up."
      bullets={[
        "Google and Trustpilot links stay visible for every star. The customer opens the link themselves.",
        "AI only suggests a cleanup of words they already wrote. They edit and copy it. Nothing is posted for them.",
        "Instant WhatsApp + email alert on a low-rating private note, with tags and status tracking",
        "Staff leaderboard, CSV export and monthly PDF reports"
      ]}
      visual={
        <div className="relative mx-auto max-w-[360px]">
          <Phone>
            <ReviewScreen />
          </Phone>
          <AlertToast className="absolute -left-1 bottom-10 hidden min-[400px]:flex sm:-left-14" />
        </div>
      }
    />
  );
}

/* ─────────────────── 4. Physical products ─────────────────── */
const PRODUCTS = [
  {
    name: "QR table stand",
    sub: "Acrylic · A6 / 4×6 in",
    tags: ["Scan"],
    art: (
      <div className="mx-auto flex h-28 w-20 flex-col items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-slate-200">
        <QrCode className="h-12 w-12 text-slate-900" />
        <span className="mt-1 text-[9px] font-bold text-slate-700">SCAN ME</span>
      </div>
    )
  },
  {
    name: "NFC + QR combo",
    sub: "Stand + tap card",
    tags: ["Scan", "Tap"],
    art: (
      <div className="relative mx-auto h-28 w-28">
        <div className="absolute left-2 top-0 flex h-28 w-20 flex-col items-center justify-center rounded-lg bg-slate-900 shadow-md">
          <QrCode className="h-11 w-11 text-white" />
          <span className="mt-1 text-[9px] font-bold text-amber-300">SCAN OR TAP</span>
        </div>
        <div className="absolute bottom-0 right-0 flex h-12 w-16 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
          <Nfc className="h-6 w-6 text-white" />
        </div>
      </div>
    )
  },
  {
    name: "PVC NFC card",
    sub: "Credit-card size",
    tags: ["Tap"],
    art: (
      <div className="mx-auto mt-6 flex h-16 w-28 items-center justify-between rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-3 shadow-md">
        <Nfc className="h-6 w-6 text-white" />
        <QrCode className="h-8 w-8 text-white/90" />
      </div>
    )
  },
  {
    name: "Table stickers",
    sub: "Round / square · packs",
    tags: ["Scan", "Tap"],
    art: (
      <div className="mx-auto mt-3 flex gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200">
            <QrCode className="h-8 w-8 text-slate-800" />
          </div>
        ))}
      </div>
    )
  }
];

export function ProductsShowcase() {
  return (
    <SectionShell id="products">
      <div className="flex flex-col items-center gap-2">
        <SoonBadge module="nfc" />
      </div>
      <SectionHeading
        eyebrow="QR + NFC products"
        title="Premium stands your customers will actually use."
        sub="Designed with your logo and colours, printed, NFC-programmed and delivered. Customers can scan the QR, or simply tap their phone."
      />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p, index) => (
          <div key={p.name} className="landing-tile" data-tone={["sage", "blush", "sky", "sand"][index]}>
            <div className="flex min-h-44 items-center justify-center">{p.art}</div>
            <h3 className="mt-4 text-xl font-bold text-ink">{p.name}</h3>
            <p className="text-xs sm:text-sm text-muted-ink">{p.sub}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.tags.map((t) => (
                <span key={t} className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-800">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-3 text-sm text-muted-ink sm:grid-cols-3">
        {[
          { icon: Printer, t: "Print-ready designs in many sizes" },
          { icon: Truck, t: "Pan-India delivery with tracking" },
          { icon: Check, t: "You approve the design before we print" }
        ].map((x) => (
          <div key={x.t} className="flex items-center justify-center gap-2 rounded-xl bg-white/60 px-3 py-3">
            <x.icon className="h-4 w-4 text-primary-600" /> {x.t}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────────────── 5. Growth tools ─────────────────── */
const GROWTH: { icon: any; title: string; body: string; module: Module }[] = [
  { icon: UsersRound, title: "Customer list", body: "Every order and feedback builds your own customer list with visits and spend.", module: "crm" },
  { icon: Gift, title: "Loyalty stamps", body: "“10th coffee free” — a visit perk tracked by phone number. Never a reward for a public review.", module: "loyalty" },
  { icon: Sparkles, title: "AI assistant", body: "Cleans up words a customer already wrote, and drafts a reply you can copy. Nothing is posted for you.", module: "ai" },
  { icon: IndianRupee, title: "UPI payments", body: "Your UPI link with the exact amount, right inside every order.", module: "whatsappStore" },
  { icon: MessageCircle, title: "WhatsApp alerts", body: "New orders and private feedback reach you instantly on WhatsApp.", module: "alerts" },
  { icon: Languages, title: "Hindi + English", body: "Your page, store and dashboard in the language your customers speak.", module: "dashboard" }
];

export function GrowthTools() {
  return (
    <SectionShell id="growth">
      <SectionHeading
        eyebrow="Grow every month"
        title="Bring customers back — again and again."
        sub="Tools that turn one-time visitors into regulars."
      />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GROWTH.map((g) => (
          <div key={g.title} className="flex gap-4 rounded-2xl bg-white/80 p-4 sm:p-5 ring-1 ring-white">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <g.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-ink">{g.title}</h3>
                <SoonBadge module={g.module} />
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-ink">{g.body}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────────────── 6. Industries ─────────────────── */
const INDUSTRIES = [
  { icon: Utensils, name: "Restaurants", use: "Table ordering & reviews" },
  { icon: Coffee, name: "Cafés & bakeries", use: "Menu, loyalty, reorders" },
  { icon: Scissors, name: "Salons & spas", use: "Services, reviews, offers" },
  { icon: Stethoscope, name: "Clinics", use: "Reviews, timings, contact" },
  { icon: Dumbbell, name: "Gyms", use: "Plans, reviews, referrals" },
  { icon: Store, name: "Retail & kirana", use: "WhatsApp catalogue orders" },
  { icon: Hotel, name: "Hotels", use: "Room menu, Wi-Fi, reviews" },
  { icon: ShoppingBag, name: "Boutiques", use: "Catalogue & Instagram" }
];

export function Industries() {
  return (
    <SectionShell id="industries">
      <SectionHeading eyebrow="Built for" title="Made for every Indian small business." />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INDUSTRIES.map((i) => (
          <div key={i.name} className="rounded-2xl bg-white/80 p-4 text-center ring-1 ring-white">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-700">
              <i.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-bold text-ink">{i.name}</p>
            <p className="mt-0.5 text-xs text-muted-ink">{i.use}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────────────── 7. Comparison ─────────────────── */
const ROWS: [string, boolean, boolean][] = [
  ["Google review link", true, true],
  ["Change links after printing", false, true],
  ["NFC tap (no camera needed)", false, true],
  ["Menu + WhatsApp ordering", false, true],
  ["Private feedback alerts", false, true],
  ["Customer list & loyalty", false, true],
  ["Scans, orders & review reports", false, true],
  ["Themes with your branding", false, true]
];

export function Comparison() {
  return (
    <SectionShell id="compare">
      <SectionHeading
        eyebrow={<span className="marketing-rupee">Why pay more than ₹200?</span>}
        title="A normal QR sticker vs. QR24x7"
        sub={<span className="marketing-rupee">A ₹200 sticker opens one link. QR24x7 runs your counter.</span>}
      />
      <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl bg-white/90 ring-1 ring-white">
        <div className="grid grid-cols-[1fr_72px_88px] sm:grid-cols-[1fr_120px_120px] items-center border-b border-slate-100 px-4 py-3 text-xs sm:text-sm font-bold text-ink">
          <span>Feature</span>
          <span className="text-center text-muted-ink">QR sticker</span>
          <span className="text-center text-primary-800">QR24x7</span>
        </div>
        {ROWS.map(([label, a, b]) => (
          <div
            key={label}
            className="grid grid-cols-[1fr_72px_88px] sm:grid-cols-[1fr_120px_120px] items-center border-b border-slate-100 px-4 py-3 last:border-0"
          >
            <span className="text-sm text-ink/85">{label}</span>
            <span className="flex justify-center">
              {a ? <Check className="h-5 w-5 text-slate-400" /> : <X className="h-5 w-5 text-rose-400" />}
            </span>
            <span className="flex justify-center">
              {b ? <Check className="h-5 w-5 text-primary-600" /> : <X className="h-5 w-5 text-rose-400" />}
            </span>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-sm text-muted-ink">
        Save on delivery-app commission: orders through your own WhatsApp store carry <b className="text-ink">0% commission</b>.
      </p>
    </SectionShell>
  );
}

/* ─────────────────── 8. FAQ ─────────────────── */
const FAQS = [
  {
    q: "What is NFC? Do my customers need an app?",
    a: "NFC is the same tap technology used for contactless payments. Most modern phones open your page when tapped on the stand — no app needed. Phones without NFC simply scan the QR code with the camera."
  },
  {
    q: "Can I change my links after the stand is printed?",
    a: "Yes. The QR and NFC point to your QR24x7 page, so you can change your menu, links, offers or theme any time from your dashboard. The printed stand stays the same."
  },
  {
    q: "How does WhatsApp ordering work?",
    a: "Customers add items to the cart and tap “Order on WhatsApp”. A neatly formatted order with items, total, table or address and a UPI payment link opens in WhatsApp, addressed to your number. You get the order instantly — with no commission."
  },
  {
    q: "Is this allowed by Google?",
    a: "Every customer sees the public Google or Trustpilot link and a private note on the same screen, whatever the star rating. AI only tidies words the customer already wrote. They edit and copy it, and nothing is posted for them. Rewards, coupons, and stamps are never offered in exchange for a public review."
  },
  {
    q: "Do you deliver the stands? How long does it take?",
    a: "Yes, pan-India with tracking. You approve the design first; we then print, program the NFC and ship — usually within a few working days, depending on your pincode."
  },
  {
    q: "Can I manage multiple branches?",
    a: "Yes. Each branch, table or staff member can have its own QR/NFC, and you see everything in one dashboard."
  },
  {
    q: "How do I pay?",
    a: "Pay in INR by UPI — no card needed."
  },
  {
    q: "Is my data safe?",
    a: "Passwords are hashed, forms are rate-limited and protected, and we never sell your or your customers' data. You can export your data any time."
  }
];

export function FaqV2() {
  return (
    <SectionShell id="faq">
      <SectionHeading eyebrow="FAQ" title="Questions owners ask us" />
      <Accordion type="single" collapsible className="mx-auto mt-8 max-w-3xl space-y-2.5">
        {FAQS.map((f, i) => (
          <AccordionItem key={f.q} value={`f${i}`} className="rounded-2xl border-0 bg-white/80 px-4 sm:px-5 ring-1 ring-white">
            <AccordionTrigger className="py-4 text-left text-sm sm:text-base font-semibold text-ink hover:no-underline">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-ink">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionShell>
  );
}

/* ─────────────────── 9. Final CTA ─────────────────── */
export function CtaV2() {
  return (
    <section className="marketing-ink-band px-5 py-20 text-center sm:px-10 sm:py-28">
      <h2 className="mx-auto max-w-2xl text-[1.75rem] leading-tight sm:text-4xl font-extrabold tracking-tight text-balance">
        Give your shop a digital counter today.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-base text-white/90">
        Start free, set up your page in minutes, and order your stand when you're ready.
      </p>
      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Button size="lg" asChild className="h-12 w-full bg-white text-primary-800 hover:bg-white/90 sm:w-auto">
          <Link href="/register">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" asChild variant="outline" className="h-12 w-full border-white/50 bg-transparent text-white hover:bg-white/10 sm:w-auto">
          <Link href="/demo">See live demo</Link>
        </Button>
      </div>
    </section>
  );
}
