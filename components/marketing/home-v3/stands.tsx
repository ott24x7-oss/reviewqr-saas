import Link from "next/link";
import type { StandAddon } from "@/lib/landing/hardware";
import { formatRupees } from "@/lib/landing/money";
import { LandingPicture } from "@/components/marketing/landing-v2/picture";

const PHOTOS = [
  "product-reviews",
  "product-store",
  "product-profile",
  "product-combo",
  "product-menu",
  "product-reviews-b",
  "product-store-b",
  "product-profile-b"
];

const FALLBACK: StandAddon[] = [
  {
    slug: "qr-stand",
    name: "QR table stand",
    nameHi: "QR table stand",
    imageUrl: "",
    salePaise: 0,
    mrpPaise: null,
    needsNfc: false
  },
  {
    slug: "nfc-stand",
    name: "NFC stand",
    nameHi: "NFC stand",
    imageUrl: "",
    salePaise: 0,
    mrpPaise: null,
    needsNfc: true
  },
  {
    slug: "table-sticker",
    name: "Table sticker",
    nameHi: "Table sticker",
    imageUrl: "",
    salePaise: 0,
    mrpPaise: null,
    needsNfc: false
  }
];

export function HomeStands({ hardware }: { hardware: StandAddon[] }) {
  const items = hardware.length > 0 ? hardware : FALLBACK;
  return (
    <section id="home-stands" className="hv3-section" aria-labelledby="home-stands-title">
      <div className="hv3-wrap">
        <h2 id="home-stands-title">Stands and NFC</h2>
        <p className="hv3-lead hv3-muted" style={{ marginTop: 8 }}>
          Printed with your QR. NFC opens the same page with a tap.
        </p>
        <div className="hv3-stands" style={{ marginTop: 16 }}>
          {items.map((item, index) => (
            <article key={item.slug} className={`hv3-card${index >= 4 ? " hv3-stand-extra" : ""}`}>
              <div className="hv3-card-photo">
                <LandingPicture
                  name={PHOTOS[index % PHOTOS.length]}
                  alt={`${item.name} product photo`}
                  width={1600}
                  height={1200}
                  sizes="(max-width: 1023px) 45vw, 280px"
                />
                {item.needsNfc ? <span className="hv3-badge">Premium</span> : null}
              </div>
              <div className="hv3-card-body">
                <h3>{item.name}</h3>
                {item.salePaise > 0 ? (
                  <p className="hv3-price marketing-rupee">
                    {formatRupees(item.salePaise)}
                    {item.mrpPaise ? <s>{formatRupees(item.mrpPaise)}</s> : null}
                  </p>
                ) : (
                  <p className="hv3-muted">Printed after you approve the proof.</p>
                )}
                <Link href="/dashboard/shop" className="hv3-btn hv3-btn-primary">
                  Order a printed stand
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
