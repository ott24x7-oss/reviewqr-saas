import Link from "next/link";
import { Star } from "lucide-react";
import type { LandingTrust } from "@/lib/landing/proof";
import { Shot } from "./shot";

function trustParts(trust: LandingTrust) {
  const parts: string[] = [];
  if (trust.rating != null) parts.push(String(trust.rating));
  if (trust.businesses != null) {
    parts.push(`${trust.businesses} ${trust.businesses === 1 ? "business" : "businesses"}`);
  }
  parts.push("Made in India");
  return parts;
}

const CARDS = [
  {
    name: "kirana",
    alt: "Shop owner weighing goods in an Indian grocery",
    label: "Shops",
    className: "hv3-hero-card-shop",
    priority: true
  },
  {
    name: "salon",
    alt: "Salon chairs in front of round mirrors",
    label: "Salons",
    className: "hv3-hero-card-salon",
    priority: false
  },
  {
    name: "owner-cafe",
    alt: "Cafe owner behind a neighborhood counter",
    label: "Cafés",
    className: "hv3-hero-card-cafe",
    priority: false
  }
];

export function HomeHero({ trust, startHref }: { trust: LandingTrust; startHref: string }) {
  const parts = trustParts(trust);
  return (
    <section id="home-hero" className="hv3-section">
      <div className="hv3-wrap hv3-hero-grid">
        <div className="hv3-stack">
          <p className="hv3-eyebrow">Scan. Tap. Grow.</p>
          <h1>Turn every scan into a review, an order, or a booking.</h1>
          <p className="hv3-lead">
            Customers scan your QR and leave a Google review, send a WhatsApp order, or book a service. No app, for
            cafés, salons, clinics, and shops.
          </p>
          <Link href={startHref} className="hv3-btn hv3-btn-primary hv3-btn-tall hv3-btn-block">
            Start free
          </Link>
          <a href="#home-flow" className="hv3-btn hv3-btn-line hv3-btn-tall hv3-btn-block">
            See how it works
          </a>
          <p className="hv3-trust">
            {trust.rating != null ? <Star size={20} strokeWidth={1.75} aria-hidden="true" /> : null}
            <span>{parts.join(" · ")}</span>
          </p>
        </div>
        <div className="hv3-hero-stage">
          {CARDS.map((card) => (
            <figure key={card.name} className={`hv3-hero-card ${card.className}`}>
              <Shot
                name={card.name}
                kind="photo"
                alt={card.alt}
                priority={card.priority}
                sizes="(max-width: 1023px) 70vw, 360px"
                width={960}
                height={1280}
              />
              <figcaption>{card.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
