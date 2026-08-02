import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import ScrollFloat from "@/components/ui/scroll-float";

export function CTA() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl gradient-brand text-white p-8 sm:p-12 md:p-16 text-center shadow-glow">
          <div
            aria-hidden
            className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-15"
          />
          <div className="relative">
            <Reveal>
            <Sparkles className="mx-auto h-10 w-10 mb-3 opacity-90" />
            <ScrollFloat as="h2" textClassName="text-3xl sm:text-4xl md:text-5xl font-bold font-display tracking-tight text-balance">
              Ready to grow your Google reviews?
            </ScrollFloat>
            <p className="mt-4 text-base sm:text-lg opacity-95 text-pretty max-w-xl mx-auto">
              Join 2,500+ Indian shops, salons, cafés and clinics. Free forever — no credit card needed.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto bg-white text-primary hover:bg-white/95">
                <Link href="/register">
                  Start Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white/10">
                <Link href="/r/demo-cafe">View Live Demo</Link>
              </Button>
            </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
