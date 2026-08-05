import { Star, TrendingUp, AlertTriangle, ArrowUpRight, MessageSquare, Users } from "lucide-react";

export function DashboardPreview() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container max-w-6xl">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
            Dashboard
          </span>
          <h2 className="section-title mt-4 font-display">
            One pane of glass for your{" "}
            <span className="gradient-text">entire reputation</span>
          </h2>
          <p className="section-sub mt-4">
            Beautifully simple. Built mobile-first because your dukan never closes.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Analytics card */}
          <div className="neu rounded-2xl p-1.5">
            <div className="rounded-xl bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-xs text-muted-foreground">Last 30 days</div>
                  <h3 className="text-lg font-semibold mt-0.5">Review trend</h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-100 text-accent-800 text-xs font-medium">
                  <TrendingUp className="h-3 w-3" /> +24%
                </span>
              </div>
              <div className="flex items-end gap-1 sm:gap-2 h-32">
                {[35, 48, 42, 55, 60, 52, 68, 72, 65, 80, 75, 88].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-0.5">
                    <div
                      className="rounded-t-md gradient-brand"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-xl font-bold">1,284</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">To Google</div>
                  <div className="text-xl font-bold text-accent-600">897</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Private</div>
                  <div className="text-xl font-bold text-amber-600">387</div>
                </div>
              </div>
            </div>
          </div>

          {/* Star distribution */}
          <div className="neu rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Rating distribution</h3>
            <div className="space-y-3">
              {[
                { stars: 5, pct: 72, count: 921 },
                { stars: 4, pct: 18, count: 230 },
                { stars: 3, pct: 5, count: 64 },
                { stars: 2, pct: 3, count: 39 },
                { stars: 1, pct: 2, count: 30 }
              ].map((row) => (
                <div key={row.stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 w-12 shrink-0">
                    <span className="text-sm font-medium">{row.stars}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        row.stars >= 4 ? "bg-accent-500" : row.stars === 3 ? "bg-amber-400" : "bg-red-400"
                      }`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground w-12 text-right">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Negative feedback alerts */}
          <div className="neu rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <h3 className="text-lg font-semibold">Negative feedback alerts</h3>
            </div>
            <ul className="space-y-3">
              {[
                { name: "Priya S.", text: "Cold parathas, no apology after I complained.", time: "2h ago", rating: 2 },
                { name: "Vikram T.", text: "Bill was wrong. Took 30 min to fix.", time: "5h ago", rating: 1 },
                { name: "Neha M.", text: "Music too loud, couldn't talk.", time: "yesterday", rating: 3 }
              ].map((f) => (
                <li
                  key={f.name}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-red-50/50 hover:bg-red-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{f.time}</span>
                    </div>
                    <div className="flex gap-0.5 my-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < f.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{f.text}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </li>
              ))}
            </ul>
          </div>

          {/* Staff leaderboard */}
          <div className="neu rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <Users className="h-4 w-4" />
              </span>
              <h3 className="text-lg font-semibold">Top performers</h3>
            </div>
            <ul className="space-y-3">
              {[
                { name: "Arjun K.", role: "Server", rating: 4.9, count: 142 },
                { name: "Meera L.", role: "Manager", rating: 4.8, count: 98 },
                { name: "Sandeep R.", role: "Server", rating: 4.7, count: 87 }
              ].map((s, i) => (
                <li key={s.name} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{s.name}</span>
                      <span className="inline-flex items-center gap-0.5 text-sm font-medium">
                        {s.rating} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{s.role} · {s.count} reviews</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
