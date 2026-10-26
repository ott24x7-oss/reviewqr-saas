import Link from "next/link";
import type { PhotoCredit } from "@/lib/landing/credits";
import { DEMO_TAP_HREF } from "./links";
import { Shot } from "./shot";

const GROUPS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: DEMO_TAP_HREF, label: "Live demo" }
    ]
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refund", label: "Refunds" }
    ]
  }
];

export function HomeFooter({
  name,
  email,
  credits
}: {
  name: string;
  email: string;
  credits: PhotoCredit[];
}) {
  return (
    <footer id="home-footer" className="hv3-section hv3-footer">
      <div className="hv3-wrap">
        <p style={{ fontWeight: 700 }}>{name}</p>
        <p className="hv3-muted" style={{ marginTop: 4 }}>
          Scan. Tap. Grow.
        </p>
        {GROUPS.map((group) => (
          <details key={group.title} style={{ marginTop: 8 }}>
            <summary>{group.title}</summary>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
        <details open style={{ marginTop: 8 }}>
          <summary>Support</summary>
          <a href={`mailto:${email}`}>{email}</a>
        </details>
        {credits.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <p className="hv3-small" style={{ fontWeight: 700 }}>
              Photo credits
            </p>
            <ul className="hv3-credits">
              {credits.map((credit) => (
                <li key={credit.id}>
                  <Shot name={credit.id} kind="photo" alt={credit.alt} sizes="140px" width={640} height={480} />
                  <a href={credit.sourceUrl}>{credit.photographer}</a>
                  <p className="hv3-small hv3-muted">{credit.licence}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="hv3-small hv3-muted" style={{ marginTop: 16 }}>
          © {new Date().getFullYear()} {name}. Made in India.
        </p>
      </div>
    </footer>
  );
}
