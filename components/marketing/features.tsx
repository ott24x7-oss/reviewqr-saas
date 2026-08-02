import {
  QrCode,
  MessageCircle,
  ShieldCheck,
  BellRing,
  Building2,
  UserCheck,
  Tag,
  FileDown,
  Globe,
  Code2,
  Mail,
  Send,
  Star,
  TrendingUp,
  ExternalLink,
  Layers
} from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="container max-w-6xl">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-brand/10 text-brand border border-brand/20 text-sm font-medium">
            Features
          </span>
          <h2 className="section-title mt-4 font-display">
            Everything you need.{" "}
            <span className="gradient-text">Nothing you don't.</span>
          </h2>
        </Reveal>

        {/* Big feature grid: each card is a mini visual mockup */}
        <RevealGroup className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <RevealItem><SmartLinkCard /></RevealItem>
          <RevealItem><QrCodeCard /></RevealItem>
          <RevealItem><NegativeAlertCard /></RevealItem>
          <RevealItem><WhatsAppCard /></RevealItem>
          <RevealItem><DashboardCard /></RevealItem>
          <RevealItem><StaffCard /></RevealItem>
          <RevealItem><TagsCard /></RevealItem>
          <RevealItem><ExportCard /></RevealItem>
          <RevealItem><WidgetCard /></RevealItem>
        </RevealGroup>

        {/* Smaller features grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: Globe, label: "Custom domain" },
            { icon: Layers, label: "White-label" },
            { icon: Building2, label: "Multi-business" },
            { icon: Mail, label: "Email reports" },
            { icon: Code2, label: "REST API" },
            { icon: ShieldCheck, label: "Spam protection" }
          ].map((f) => (
            <div key={f.label} className="rounded-lg border border-border bg-surface p-3 flex items-center gap-2 hover:shadow-neu transition">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10 text-brand shrink-0">
                <f.icon className="h-4 w-4" />
              </span>
              <span className="text-xs sm:text-sm font-medium truncate">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============== Feature cards with mockups ============== */

function FeatureFrame({
  title,
  tag,
  tagTone = "primary",
  children
}: {
  title: string;
  tag: string;
  tagTone?: "primary" | "accent" | "warning";
  children: React.ReactNode;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-brand/15 text-brand",
    accent: "bg-accent/15 text-accent",
    warning: "bg-amber-400/15 text-amber-400"
  };
  return (
    <div className="group rounded-2xl border border-border bg-surface p-5 shadow-neu hover:shadow-glow hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base text-ink">{title}</h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${toneMap[tagTone]}`}>
          {tag}
        </span>
      </div>
      <div className="flex-1 min-h-[180px] rounded-xl bg-elevated border border-border p-3 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function SmartLinkCard() {
  return (
    <FeatureFrame title="Smart review link" tag="Auto" tagTone="primary">
      <div className="w-full">
        <div className="rounded-lg bg-surface border border-border shadow-neu p-3">
          <div className="flex justify-center gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-5 w-5 ${
                  n <= 4 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="text-[10px] text-center font-semibold text-accent">
            4★ → Google
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-md bg-accent/10 border border-accent/20 p-2 text-[9px] text-center">
            <div className="font-bold text-accent">4★ – 5★</div>
            <div className="text-muted-foreground">→ Google</div>
          </div>
          <div className="rounded-md bg-amber-400/10 border border-amber-400/20 p-2 text-[9px] text-center">
            <div className="font-bold text-amber-400">1★ – 3★</div>
            <div className="text-muted-foreground">→ Private form</div>
          </div>
        </div>
      </div>
    </FeatureFrame>
  );
}

function QrCodeCard() {
  return (
    <FeatureFrame title="Print-ready QR posters" tag="Print" tagTone="primary">
      <div className="bg-white rounded-lg border-2 border-brand/40 p-3 shadow-neu">
        <div className="text-[9px] font-bold text-center gradient-text mb-1">SCAN ME</div>
        <svg viewBox="0 0 36 36" className="w-20 h-20 mx-auto" fill="#1a73e8">
          <rect x="0" y="0" width="10" height="10" />
          <rect x="2" y="2" width="6" height="6" fill="white" />
          <rect x="4" y="4" width="2" height="2" fill="#1a73e8" />
          <rect x="26" y="0" width="10" height="10" />
          <rect x="28" y="2" width="6" height="6" fill="white" />
          <rect x="30" y="4" width="2" height="2" fill="#1a73e8" />
          <rect x="0" y="26" width="10" height="10" />
          <rect x="2" y="28" width="6" height="6" fill="white" />
          <rect x="4" y="30" width="2" height="2" fill="#1a73e8" />
          <rect x="14" y="2" width="2" height="4" />
          <rect x="22" y="2" width="2" height="6" />
          <rect x="14" y="14" width="6" height="2" />
          <rect x="22" y="14" width="2" height="6" />
          <rect x="14" y="22" width="2" height="6" />
          <rect x="18" y="26" width="6" height="2" />
          <rect x="30" y="24" width="4" height="4" />
        </svg>
        <div className="mt-1 text-[8px] text-center text-muted-foreground">Counter · Table · Bill</div>
      </div>
    </FeatureFrame>
  );
}

function NegativeAlertCard() {
  return (
    <FeatureFrame title="Negative feedback alerts" tag="Live" tagTone="warning">
      <div className="w-full space-y-2">
        <div className="rounded-lg bg-surface border border-border p-2.5 flex items-start gap-2 shadow-neu">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-red-400 shrink-0">
            <BellRing className="h-3.5 w-3.5" />
          </span>
          <div className="text-[10px] min-w-0">
            <div className="font-semibold text-ink">2★ feedback</div>
            <div className="text-muted-foreground truncate">"Cold parathas, no apology"</div>
            <div className="text-[9px] text-red-400 font-medium mt-0.5">just now</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[9px]">
          <div className="px-2 py-1 rounded bg-surface border border-border flex items-center gap-1 flex-1 justify-center">
            <Mail className="h-2.5 w-2.5 text-brand" /> Email sent
          </div>
          <div className="px-2 py-1 rounded bg-surface border border-border flex items-center gap-1 flex-1 justify-center">
            <MessageCircle className="h-2.5 w-2.5 text-[#25D366]" /> WA sent
          </div>
        </div>
      </div>
    </FeatureFrame>
  );
}

function WhatsAppCard() {
  return (
    <FeatureFrame title="WhatsApp templates" tag="Auto" tagTone="accent">
      <div className="w-full">
        <div className="rounded-2xl bg-[#075e54] p-2 max-w-[200px] ml-auto">
          <div className="rounded-xl rounded-tr-sm bg-white p-2.5 text-[9px] leading-relaxed shadow-sm">
            <div className="font-semibold mb-0.5">Hi Ananya! 🙏</div>
            <div className="text-foreground/80">
              Loved your visit to <b>Spice Junction</b>?
              <br />
              Quick review:
              <br />
              <span className="text-primary underline">reviewqr.in/r/...</span>
            </div>
            <div className="mt-1 text-[8px] text-muted-foreground text-right">10:24 AM ✓✓</div>
          </div>
        </div>
        <div className="mt-2 inline-flex items-center gap-1 text-[9px] text-muted-foreground bg-surface px-2 py-1 rounded-full border border-border">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          5x more reviews
        </div>
      </div>
    </FeatureFrame>
  );
}

function DashboardCard() {
  return (
    <FeatureFrame title="Real-time dashboard" tag="Mobile" tagTone="primary">
      <div className="w-full grid grid-cols-2 gap-1.5">
        <div className="rounded-md bg-surface border border-border p-2">
          <div className="text-[8px] text-muted-foreground">Reviews</div>
          <div className="text-base font-bold text-ink">1,284</div>
          <div className="text-[8px] text-accent font-medium">+12%</div>
        </div>
        <div className="rounded-md bg-surface border border-border p-2">
          <div className="text-[8px] text-muted-foreground">Avg</div>
          <div className="text-base font-bold inline-flex items-center gap-0.5 text-ink">
            4.7 <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          </div>
          <div className="text-[8px] text-accent font-medium">+0.2</div>
        </div>
        <div className="col-span-2 rounded-md bg-surface border border-border p-2">
          <div className="flex items-end gap-0.5 h-8">
            {[40, 55, 48, 62, 70, 68, 82, 75, 88, 92].map((h, i) => (
              <div key={i} className="flex-1 rounded-t gradient-brand" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </FeatureFrame>
  );
}

function StaffCard() {
  return (
    <FeatureFrame title="Staff-wise tracking" tag="Pro" tagTone="accent">
      <div className="w-full space-y-1.5">
        {[
          { name: "Arjun K.", rating: 4.9, count: 142, top: true },
          { name: "Meera L.", rating: 4.8, count: 98 },
          { name: "Sandeep R.", rating: 4.7, count: 87 }
        ].map((s, i) => (
          <div
            key={s.name}
            className={`rounded-md border p-2 flex items-center gap-2 text-[10px] text-ink ${
              s.top ? "bg-amber-400/10 border-amber-400/30" : "bg-surface border-border"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-elevated text-[9px] font-bold">
              {i + 1}
            </span>
            <span className="font-medium flex-1 truncate">{s.name}</span>
            <span className="inline-flex items-center gap-0.5 font-bold">
              {s.rating} <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            </span>
          </div>
        ))}
      </div>
    </FeatureFrame>
  );
}

function TagsCard() {
  return (
    <FeatureFrame title="Smart feedback tags" tag="AI" tagTone="primary">
      <div className="w-full">
        <div className="rounded-lg bg-surface border border-border p-2.5 text-[9px] mb-2">
          <div className="font-medium leading-relaxed text-ink">"Server was rude when we asked for water"</div>
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { label: "Staff", color: "#ef4444" },
            { label: "Service", color: "#f59e0b" },
            { label: "Speed", color: "#3b82f6" }
          ].map((t) => (
            <span
              key={t.label}
              className="px-2 py-0.5 rounded-full text-[9px] font-medium border bg-surface"
              style={{ borderColor: t.color, color: t.color }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </FeatureFrame>
  );
}

function ExportCard() {
  return (
    <FeatureFrame title="CSV / PDF export" tag="Easy" tagTone="primary">
      <div className="w-full bg-surface rounded-lg border border-border p-3">
        <div className="flex items-center gap-2 mb-2">
          <FileDown className="h-4 w-4 text-brand" />
          <span className="text-[10px] font-semibold text-ink">reviews-2026-04.csv</span>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-1 text-[8px]">
              <div className="h-2 rounded bg-elevated" />
              <div className="h-2 rounded bg-elevated" />
              <div className="h-2 rounded bg-brand/30" />
            </div>
          ))}
        </div>
        <div className="mt-2 text-[9px] text-accent font-medium">1,284 rows · 247 KB</div>
      </div>
    </FeatureFrame>
  );
}

function WidgetCard() {
  return (
    <FeatureFrame title="Public testimonial widget" tag="Embed" tagTone="accent">
      <div className="w-full bg-surface rounded-lg border border-border p-3 shadow-neu">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded gradient-brand text-white text-[10px] font-bold flex items-center justify-center">
            S
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold truncate text-ink">Spice Junction</div>
            <div className="flex items-center gap-1">
              <span className="text-amber-400 text-[9px]">★★★★★</span>
              <span className="text-[8px] text-muted-foreground">4.7 · 1,284</span>
            </div>
          </div>
        </div>
        <div className="rounded-md bg-elevated p-2 text-[9px]">
          <div className="text-amber-400 mb-0.5">★★★★★</div>
          <div className="text-foreground/80 line-clamp-2">
            "Loved the masala dosa! Best in Indiranagar."
          </div>
        </div>
      </div>
    </FeatureFrame>
  );
}
