import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="qr-eyebrow">{children}</p>;
}

export function SectionHeading({
  number,
  eyebrow,
  title,
  description,
  centered = false
}: {
  number?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={`qr-section-heading${centered ? " is-centered" : ""}`}>
      <Eyebrow>{number ? `${number} / ` : ""}{eyebrow || "QR24x7"}</Eyebrow>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function PhoneScreenshot({
  src,
  alt,
  sizes = "(max-width: 760px) 230px, 300px",
  priority = false,
  crop
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  crop?: "orders" | "analytics";
}) {
  return (
    <div className={`qr-phone${crop ? ` qr-phone-crop-${crop}` : ""}`}>
      <div className="qr-phone-screen">
        <Image src={src} alt={alt} width={540} height={1120} sizes={sizes} priority={priority} />
      </div>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  id
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="qr-page-intro">
      <div className="qr-wrap qr-page-intro-inner">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="qr-text-link" href={href}>{children} <span aria-hidden="true">↗</span></Link>;
}
