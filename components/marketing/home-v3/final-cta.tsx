import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function HomeFinalCta({ startHref, whatsapp }: { startHref: string; whatsapp: string | null }) {
  return (
    <section id="home-cta" className="hv3-section hv3-cta">
      <div className="hv3-wrap hv3-stack" style={{ alignItems: "stretch" }}>
        <h2>Set up in 10 minutes</h2>
        <Link href={startHref} className="hv3-btn hv3-btn-primary hv3-btn-tall hv3-btn-block">
          Start free
        </Link>
        {whatsapp ? (
          <a className="hv3-btn hv3-btn-line hv3-btn-tall hv3-btn-block" href={whatsapp}>
            <MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
            Chat on WhatsApp
          </a>
        ) : null}
      </div>
    </section>
  );
}
