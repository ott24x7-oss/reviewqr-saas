"use client";
import * as React from "react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#store", label: "Store" },
  { href: "#products", label: "QR+NFC" },
  { href: "#pricing", label: "Pricing" }
];

/** Section shortcuts that appear after the hero and step aside near the footer. */
export function AnchorPill({ links = LINKS }: { links?: Array<{ href: string; label: string }> }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - 480;
      setVisible(y > window.innerHeight * 0.7 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav className="marketing-anchor" data-visible={visible ? "true" : "false"} aria-label="On this page" aria-hidden={!visible}>
      {links.map((link) => (
        <a key={link.href} href={link.href} tabIndex={visible ? 0 : -1}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
