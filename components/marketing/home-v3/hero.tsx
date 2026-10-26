import Link from "next/link";
import { Star } from "lucide-react";
import type { LandingTrust } from "@/lib/landing/proof";
import { DEMO_TAP_HREF } from "./links";
import { PhoneFrame } from "./phone-frame";
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

export function HomeHero({ trust, startHref }: { trust: LandingTrust; startHref: string }) {
  const parts = trustParts(trust);
  return (
    <section id="home-hero" className="hv3-section">
      <div className="hv3-wrap hv3-hero-grid">
        <div className="hv3-stack">
          <p className="hv3-eyebrow">For cafés, shops & salons</p>
          <h1>
            Get more Google reviews
            <br />
            and WhatsApp orders,
            <br />
            from one QR stand
          </h1>
          <p className="hv3-lead">
            Customers scan, see your menu, order on WhatsApp and review you on Google. No app, no commission.
          </p>
          <Link href={startHref} className="hv3-btn hv3-btn-primary hv3-btn-tall hv3-btn-block">
            Start free
          </Link>
          <Link href={DEMO_TAP_HREF} className="hv3-btn hv3-btn-line hv3-btn-tall hv3-btn-block">
            See a live demo
          </Link>
          <p className="hv3-trust">
            {trust.rating != null ? <Star size={20} strokeWidth={1.75} aria-hidden="true" /> : null}
            <span>{parts.join(" · ")}</span>
          </p>
        </div>
        <div className="hv3-visual">
          <Shot
            name="stand-hero"
            kind="photo"
            alt="Acrylic QR stand on a café counter"
            priority
            sizes="(max-width: 1023px) 100vw, 560px"
            width={800}
            height={1000}
          />
          <div className="hv3-visual-phone">
            <PhoneFrame>
              <Shot
                name="tap"
                kind="ui"
                alt="Demo café tap page"
                priority
                sizes="180px"
                width={390}
                height={844}
              />
            </PhoneFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
