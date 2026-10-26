"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function HomeSticky({ startHref, whatsapp }: { startHref: string; whatsapp: string | null }) {
  const [on, setOn] = React.useState(false);

  React.useEffect(() => {
    const hero = document.getElementById("home-hero");
    const footer = document.getElementById("home-footer");
    if (!hero) return;
    let heroGone = false;
    let footerNear = false;
    const update = () => setOn(heroGone && !footerNear);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === hero) {
            heroGone = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          }
          if (entry.target === footer) footerNear = entry.isIntersecting;
        }
        update();
      },
      { threshold: 0 }
    );
    observer.observe(hero);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <div id="sticky-cta" className="hv3-sticky" hidden={!on}>
      <Link href={startHref} className="hv3-btn hv3-btn-primary">
        Start free
      </Link>
      {whatsapp ? (
        <a className="hv3-icon-btn" href={whatsapp} aria-label="Chat on WhatsApp">
          <MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
