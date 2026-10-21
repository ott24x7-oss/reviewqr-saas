import { Sparkles, Copy, Check, Wand2, Clock, Languages } from "lucide-react";

/**
 * AI only tidies words the customer already wrote.
 */
export function AiHighlight() {
  return (
    <section className="relative overflow-hidden px-5 sm:px-10 py-16 sm:py-24">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Copy */}
        <div className="order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-semibold text-brand">
            <Sparkles className="h-3.5 w-3.5" /> Cleanup only
          </div>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.1] text-ink">
            They write the review.
            <br />
            <span className="text-gradient">AI only tidies it.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-ink leading-relaxed max-w-lg">
            A customer writes a few words, or taps a short topic into their own text. AI may suggest a
            cleaner version for <b className="gradient-text-google">Google</b> or{" "}
            <b className="text-[#00b67a]">Trustpilot</b>. They edit it, then copy and paste it
            themselves. Nothing is posted for them.
          </p>

          <div className="mt-7 grid sm:grid-cols-3 gap-3">
            {[
              { icon: Wand2, t: "Their own words", s: "At least a few, or a topic hint" },
              { icon: Clock, t: "They edit it", s: "Then they copy it" },
              { icon: Languages, t: "Nothing auto-posted", s: "They paste it themselves" }
            ].map((f) => (
              <div key={f.t} className="neu rounded-2xl p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <f.icon className="h-5 w-5" />
                </span>
                <div className="mt-2.5 text-sm font-semibold text-ink">{f.t}</div>
                <div className="text-xs text-muted-ink">{f.s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3D device mockup */}
        <div className="order-1 lg:order-2 [perspective:1600px]">
          <figure
            className="relative mx-auto max-w-sm neu rounded-[2rem] p-4 sm:p-5 will-change-transform"
            style={{ transform: "rotateY(-14deg) rotateX(6deg)" }}
          >
            {/* header */}
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-grad-brand grid place-items-center text-white font-bold text-sm shadow-glow">
                S
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink truncate">Spice Junction Café</div>
                <div className="text-[11px] text-muted-ink">Suggested wording</div>
              </div>
            </div>

            {/* answer chips */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["hot dosa", "quick service", "warm staff"].map((c) => (
                <span
                  key={c}
                  className="skeuo-accent text-white text-[11px] font-medium rounded-full px-2.5 py-1"
                >
                  {c}
                </span>
              ))}
            </div>

            {/* suggested wording */}
            <div className="mt-3 neu-inset rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-brand uppercase tracking-wide">
                <Sparkles className="h-3 w-3" /> Cleaned-up wording
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink/90">
                "The dosa was hot, the service was quick, and the staff were warm."
              </p>
              <div className="mt-3 flex justify-end">
                <span className="skeuo-accent text-white text-[11px] font-semibold rounded-lg px-3 py-1.5 inline-flex items-center gap-1">
                  <Copy className="h-3 w-3" /> Copy
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-ink">
              <Check className="h-3.5 w-3.5 text-accent" /> Copied. They paste it themselves.
            </div>

            {/* floating badge */}
            <div className="absolute -left-4 -bottom-4 hidden sm:flex items-center gap-2 glass rounded-2xl px-3 py-2 shadow-lg">
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-xs font-semibold text-ink">They can edit it first</span>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
