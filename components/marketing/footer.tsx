import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { DEFAULT_BRAND_NAME, DEFAULT_BRAND_TAGLINE } from "@/lib/brand-defaults";
import { BRAND_ICON, BRAND_LOGO } from "@/lib/brand-assets";

export function Footer({
  brand
}: {
  brand?: { name: string; logoUrl: string; supportEmail: string; tagline?: string };
}) {
  const name = brand?.name || DEFAULT_BRAND_NAME;
  const logoUrl = brand?.logoUrl || "";
  const supportEmail = brand?.supportEmail || "hello@qr24x7.in";
  const tagline = brand?.tagline || DEFAULT_BRAND_TAGLINE;
  const customLogo = logoUrl && logoUrl !== BRAND_ICON ? logoUrl : "";
  const mark = customLogo || BRAND_LOGO;
  return (
    <footer className="marketing-footer border-t border-[var(--marketing-line)]">
      <div className="container max-w-6xl py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mark}
                alt={name}
                className={customLogo ? "h-9 w-9 rounded-lg object-cover" : "h-9 w-auto max-w-[160px] object-contain"}
              />
              <span className="font-display">{name}</span>
            </Link>
            <p className="mt-3 text-sm font-medium text-foreground">{tagline}</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
              Every customer can leave a public Google or Trustpilot review, and can also tell you privately.
            </p>
            <div className="mt-4 space-y-1.5 text-sm">
              <a
                href={`mailto:${supportEmail}`}
                className="flex min-h-11 items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Mail className="h-4 w-4" /> {supportEmail}
              </a>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> Bengaluru, India
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Product</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
              <li><Link href="/how-it-works" className="hover:text-foreground">How it works</Link></li>
              <li><Link href="/features#how" className="hover:text-foreground">How it works on this page</Link></li>
              <li><a href="/#pricing" className="hover:text-foreground">Pricing</a></li>
              <li><Link href="/demo" className="hover:text-foreground">Live demo</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Company</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground">About</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
              <li><Link href="/refund" className="hover:text-foreground">Refunds</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} {name}. Made in India 🇮🇳</div>
          <div>v1.0</div>
        </div>
      </div>
    </footer>
  );
}
