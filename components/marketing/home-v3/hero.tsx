"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { LandingTrust } from "@/lib/landing/proof";
import { Reveal } from "./reveal";
import { Shot } from "./shot";

const WORDS = "Turn every scan into a review, an order, or a booking.".split(" ");

function Headline() {
  const reduce = useReducedMotion() === true;
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);
  if (!ready || reduce) return <h1>Turn every scan into a review, an order, or a booking.</h1>;
  return (
    <h1>
      {WORDS.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "inline-block", marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

function countLabel(count: number, one: string, many: string) {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? one : many}`;
}

function trustParts(trust: LandingTrust) {
  const parts: string[] = [];
  if (trust.rating != null) parts.push(`${trust.rating} average`);
  if (trust.businesses != null) parts.push(countLabel(trust.businesses, "business live", "businesses live"));
  if (trust.reviewCount != null) parts.push(countLabel(trust.reviewCount, "review", "reviews"));
  if (trust.orderCount != null) parts.push(countLabel(trust.orderCount, "WhatsApp order", "WhatsApp orders"));
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
          <Headline />
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
        <Reveal className="hv3-hero-stage" y={12} delay={0.08}>
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
        </Reveal>
      </div>
    </section>
  );
}
