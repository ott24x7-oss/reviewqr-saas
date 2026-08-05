"use client";
import Link from "next/link";
import { ArrowRight, Star, Play, ChevronRight, MessageCircle, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { RotatingReviewWord } from "@/components/marketing/rotating-word";

export function Hero() {
  return (
    <section className="relative pt-10 pb-12 sm:pt-14 sm:pb-20 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-grid-pattern bg-[size:32px_32px] opacity-50"
        style={{
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)"
        }}
      />
      <div aria-hidden className="absolute inset-x-0 -top-40 -z-10 transform-gpu blur-3xl">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-300 to-accent-300 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72rem]" />
      </div>

      <div className="container max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: minimal copy */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-medium">
              <span className="flex h-2 w-2 rounded-full bg-accent-500 animate-pulse-soft" />
              2,500+ Indian SMBs
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-balance">
              Happy customers →{" "}
              <RotatingReviewWord />
            </h1>
            <p className="mt-3 text-base sm:text-lg text-muted-foreground text-pretty max-w-md mx-auto lg:mx-0">
              Our <b className="text-foreground">AI writes the 5★ review for them</b> — they just tap
              Copy and post it to <b className="gradient-text-google">Google</b> or{" "}
              <b className="text-[#00b67a]">Trustpilot</b>. Unhappy ones go to your private inbox. One
              smart QR, 30 seconds.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center lg:justify-start">
              <Button size="lg" variant="skeuo" asChild className="w-full sm:w-auto">
                <Link href="/register">
                  Start Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="neu" asChild className="w-full sm:w-auto">
                <Link href="/r/demo-cafe">
                  <Play className="h-4 w-4" /> Try the demo
                </Link>
              </Button>
            </div>

            {/* Works-with platforms */}
            <div className="mt-6 flex items-center gap-2.5 justify-center lg:justify-start text-xs text-muted-foreground">
              <span className="font-medium">Grows your reviews on</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-white px-2.5 py-1 font-semibold">
                <span className="gradient-text-google">Google</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#00b67a]/30 bg-white px-2.5 py-1 font-semibold text-[#00b67a]">
                <Star className="h-3 w-3 fill-[#00b67a] text-[#00b67a]" /> Trustpilot
              </span>
            </div>

            {/* Tiny trust strip */}
            <div className="mt-7 flex items-center gap-3 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {["Ravi", "Priya", "Arjun", "Sneha"].map((n) => (
                  <AvatarInitials
                    key={n}
                    name={n}
                    className="h-8 w-8 text-[11px] border-2 border-white"
                  />
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 text-sm font-semibold">4.9</span>
                </div>
                <p className="text-xs text-muted-foreground">from 800+ owners</p>
              </div>
            </div>
          </div>

          {/* Right: layered phone + dashboard mockup */}
          <div className="order-1 lg:order-2 relative">
            <div className="relative max-w-md mx-auto">
              {/* Backdrop dashboard mock */}
              <div className="absolute -right-6 -top-4 sm:-right-12 sm:-top-8 w-72 sm:w-80 rounded-xl border bg-white shadow-card overflow-hidden hidden sm:block rotate-3">
                <div className="flex items-center gap-1 px-3 py-2 border-b bg-secondary/50">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="ml-2 text-[10px] text-muted-foreground font-mono">app.reviewqr.in</span>
                </div>
                <div className="p-3 grid grid-cols-2 gap-2 bg-gradient-to-br from-primary-50/40 to-accent-50/40">
                  <div className="rounded-lg bg-white border p-2.5">
                    <div className="text-[10px] text-muted-foreground">Reviews</div>
                    <div className="text-lg font-bold">1,284</div>
                    <div className="text-[10px] text-accent-600 font-medium">+12%</div>
                  </div>
                  <div className="rounded-lg bg-white border p-2.5">
                    <div className="text-[10px] text-muted-foreground">Avg</div>
                    <div className="text-lg font-bold inline-flex items-center gap-0.5">
                      4.7 <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="text-[10px] text-accent-600 font-medium">+0.2</div>
                  </div>
                  <div className="col-span-2 rounded-lg bg-white border p-2.5">
                    <div className="text-[10px] text-muted-foreground mb-1">Last 7 days</div>
                    <div className="flex items-end gap-1 h-10">
                      {[40, 55, 48, 62, 70, 68, 82].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t gradient-brand"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Foreground phone mockup */}
              <div className="relative mx-auto w-64 sm:w-72 aspect-[9/19] rounded-[2.5rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 h-5 w-24 rounded-full bg-zinc-900 z-20" />
                <div className="relative h-full w-full rounded-[2rem] overflow-hidden bg-white">
                  <div className="bg-white border-b px-4 py-3 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold">
                      S
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">Spice Junction Café</div>
                      <div className="text-[9px] text-muted-foreground">Indiranagar</div>
                    </div>
                  </div>
                  <div className="px-4 pt-6 pb-4">
                    <div className="text-base font-bold font-display text-center">
                      How was your<br />experience?
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
                      Tap a star — only takes 30 seconds
                    </p>
                    <div className="mt-5 flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-7 w-7 transition-all ${
                            n <= 4 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                          } ${n === 5 ? "animate-pulse-soft" : ""}`}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-full bg-accent-100 text-accent-800 text-[10px] font-semibold">
                        Great
                      </span>
                    </div>
                    <div className="mt-5 rounded-xl bg-secondary/60 border p-3 text-center">
                      <div className="text-[10px] text-muted-foreground">Auto-redirecting to</div>
                      <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold">
                        <span><span className="gradient-text-google">G</span>oogle</span>
                        <span className="text-muted-foreground/50">/</span>
                        <span className="text-[#00b67a]">Trustpilot</span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
                      Powered by <span className="gradient-text font-semibold">ReviewQR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -left-4 sm:-left-12 top-1/3 w-56 rounded-xl bg-white shadow-card border p-3 flex items-start gap-2 animate-fade-in">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                  <Heart className="h-3.5 w-3.5 fill-accent-600" />
                </span>
                <div className="text-xs">
                  <div className="font-semibold">Ananya gave 5★</div>
                  <div className="text-muted-foreground">"Loved the masala dosa!"</div>
                </div>
              </div>

              {/* Floating WhatsApp ping */}
              <div className="absolute -right-2 sm:-right-10 bottom-10 w-52 rounded-xl bg-white shadow-card border p-3 flex items-start gap-2 animate-fade-in">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                  <MessageCircle className="h-3.5 w-3.5" />
                </span>
                <div className="text-xs">
                  <div className="font-semibold">WhatsApp alert</div>
                  <div className="text-muted-foreground">Negative feedback received</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
