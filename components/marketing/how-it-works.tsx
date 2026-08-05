import { QrCode, Sparkles, Star, Send, ArrowRight, Bell, Check } from "lucide-react";

/**
 * Customer process — 3 clean steps with material cards + mini 3D-tilt mockups.
 * Anchor id="how" kept for the nav.
 */
export function HowItWorks() {
  return (
    <section id="how" className="px-5 sm:px-10 py-16 sm:py-24">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 border border-accent/20 px-3 py-1 text-xs font-semibold text-accent">
          How it works
        </div>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
          Live in 5 minutes. Then it runs <span className="text-gradient">on autopilot.</span>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-muted-ink">
          No app for your customer to download. No training for your staff. Just one smart QR on the
          table, the bill, or the counter.
        </p>
      </div>

      <div className="mt-14 grid md:grid-cols-3 gap-5 lg:gap-6 relative">
        <Step
          n={1}
          icon={QrCode}
          title="Customer scans"
          desc="They point their phone at your QR — no app, no signup. Your branded review page opens instantly."
        >
          <div className="[perspective:1200px]">
            <div
              className="neu-inset rounded-2xl p-4 grid place-items-center"
              style={{ transform: "rotateX(8deg)" }}
            >
              <svg viewBox="0 0 40 40" className="w-20 h-20" fill="currentColor">
                <g className="text-ink">
                  <rect x="1" y="1" width="11" height="11" rx="2" />
                  <rect x="3.5" y="3.5" width="6" height="6" rx="1" fill="#eef1f6" />
                  <rect x="28" y="1" width="11" height="11" rx="2" />
                  <rect x="30.5" y="3.5" width="6" height="6" rx="1" fill="#eef1f6" />
                  <rect x="1" y="28" width="11" height="11" rx="2" />
                  <rect x="3.5" y="30.5" width="6" height="6" rx="1" fill="#eef1f6" />
                  <rect x="16" y="3" width="3" height="6" />
                  <rect x="22" y="3" width="3" height="9" />
                  <rect x="16" y="16" width="8" height="3" />
                  <rect x="28" y="16" width="3" height="9" />
                  <rect x="17" y="24" width="3" height="9" />
                  <rect x="24" y="28" width="9" height="3" />
                  <rect x="34" y="34" width="5" height="5" />
                </g>
              </svg>
            </div>
          </div>
        </Step>

        <Step
          n={2}
          icon={Sparkles}
          title="Taps a rating — AI drafts it"
          desc="They tap a star and 3 quick buttons. Our AI instantly writes a genuine review in their words — ready to copy."
        >
          <div className="neu-inset rounded-2xl p-3.5">
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-1 mb-2">
              {["Great food", "Quick"].map((c) => (
                <span key={c} className="skeuo-accent text-white text-[9px] rounded-full px-2 py-0.5">
                  {c}
                </span>
              ))}
            </div>
            <div className="rounded-lg bg-white p-2 text-[10px] leading-snug text-ink/80">
              "Amazing dosa and super quick service — highly recommend!"
            </div>
          </div>
        </Step>

        <Step
          n={3}
          icon={Send}
          title="Google & Trustpilot grow — or you're alerted"
          desc="Happy reviews land on Google or Trustpilot in one paste. Unhappy ones hit your private inbox with an instant alert."
        >
          <div className="space-y-2">
            <div className="neu-inset rounded-xl p-2.5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
                <Check className="h-4 w-4" />
              </span>
              <div className="text-[10px]">
                <span className="font-bold"><span className="gradient-text-google">Google</span> <span className="text-muted-ink font-normal">/</span> <span className="text-[#00b67a]">Trustpilot</span></span>
                <div className="text-muted-ink">Public 5★ review</div>
              </div>
            </div>
            <div className="neu-inset rounded-xl p-2.5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-amber-500 shrink-0">
                <Bell className="h-4 w-4" />
              </span>
              <div className="text-[10px]">
                <span className="font-bold text-ink">Private alert</span>
                <div className="text-muted-ink">Only you see it</div>
              </div>
            </div>
          </div>
        </Step>
      </div>
    </section>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  desc,
  children
}: {
  n: number;
  icon: React.ElementType;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative neu rounded-3xl p-6 flex flex-col">
      <div className="flex items-center gap-3">
        <span className="skeuo-accent text-white h-9 w-9 rounded-xl grid place-items-center font-bold text-sm">
          {n}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-ink leading-relaxed">{desc}</p>
      <div className="mt-5">{children}</div>

      {/* connector arrow (desktop) */}
      {n < 3 && (
        <div className="hidden md:flex absolute top-1/2 -right-4 lg:-right-5 z-10 h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full glass text-brand">
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
