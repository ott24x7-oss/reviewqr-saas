import { TrendingUp, Star, Users, Clock } from "lucide-react";

const STATS = [
  { icon: Users, value: "2,500+", label: "Indian businesses" },
  { icon: TrendingUp, value: "3.2×", label: "more Google & Trustpilot reviews" },
  { icon: Star, value: "+0.5★", label: "average rating lift" },
  { icon: Clock, value: "30 sec", label: "per review, start to post" }
];

export function StatsBand() {
  return (
    <section className="px-5 sm:px-10 py-12 sm:py-16">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Real results, <span className="text-gradient">not just reviews.</span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-ink">
          What owners see in their first 60 days on ReviewQR.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="neu rounded-2xl p-5 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <s.icon className="h-5 w-5" />
            </span>
            <div className="mt-3 font-display text-3xl sm:text-4xl font-bold text-ink tabular-nums">
              {s.value}
            </div>
            <div className="mt-1 text-xs sm:text-sm text-muted-ink">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
