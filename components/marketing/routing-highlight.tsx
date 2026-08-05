import { Star, ArrowRight, ShieldCheck, Globe, Lock, BellRing } from "lucide-react";

/**
 * Flagship highlight: smart routing. Happy → public Google review,
 * unhappy → private feedback in your own dashboard. Pure CSS branching
 * diagram; drop in a real render later if desired.
 */
export function RoutingHighlight() {
  return (
    <section className="px-5 sm:px-10 py-16 sm:py-24">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-semibold text-brand">
          <ShieldCheck className="h-3.5 w-3.5" /> Smart routing
        </div>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
          Happy customers go <span className="text-gradient">public.</span>
          <br className="hidden sm:block" /> Unhappy ones come to you — <span className="text-accent">privately.</span>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-muted-ink">
          One smart QR reads the rating and sends each customer down the right path — so you grow your
          <b className="text-ink"> Google &amp; Trustpilot</b> score <b className="text-ink">and</b> catch
          problems before they go public.
        </p>
      </div>

      {/* Branch diagram */}
      <div className="mt-12 grid lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-4 items-center max-w-5xl mx-auto">
        {/* Source */}
        <div className="neu rounded-3xl p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-grad-brand text-white shadow-glow">
            <Star className="h-7 w-7 fill-white" />
          </div>
          <div className="mt-3 font-semibold text-ink">Customer scans the QR</div>
          <div className="text-sm text-muted-ink">Taps a star — 5 seconds</div>
          <div className="mt-4 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>

        {/* Split arrow */}
        <div className="hidden lg:flex flex-col items-center justify-center gap-8 text-muted-ink">
          <ArrowRight className="h-6 w-6 text-accent" />
          <ArrowRight className="h-6 w-6 text-amber-500" />
        </div>

        {/* Two outcomes */}
        <div className="space-y-4">
          {/* Positive */}
          <div className="neu rounded-3xl p-5 border-l-4 border-l-accent">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Globe className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                  4–5★ <ArrowRight className="h-3.5 w-3.5 text-muted-ink" />{" "}
                  <span className="gradient-text-google font-bold">Google</span>
                  <span className="text-muted-ink font-normal">or</span>
                  <span className="text-[#00b67a] font-bold">Trustpilot</span>
                </div>
                <div className="text-sm text-muted-ink">Public 5-star review, written by AI</div>
              </div>
            </div>
          </div>

          {/* Negative */}
          <div className="neu rounded-3xl p-5 border-l-4 border-l-amber-400">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  1–3★ <ArrowRight className="h-3.5 w-3.5 text-muted-ink" />{" "}
                  <span className="text-ink">Your private inbox</span>
                </div>
                <div className="text-sm text-muted-ink flex items-center gap-1">
                  <BellRing className="h-3.5 w-3.5 text-amber-500" /> Instant WhatsApp + email alert —
                  never public
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
