import Link from "next/link";
import { Star, Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container max-w-6xl py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand">
                <Star className="h-5 w-5 fill-white text-white" />
              </span>
              <span className="font-display">ReviewQR</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs leading-relaxed">
              The simplest way for Indian SMBs to grow Google reviews and catch unhappy customers privately.
            </p>
            <div className="mt-4 space-y-1.5 text-sm">
              <a href="mailto:hello@reviewqr.in" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Mail className="h-4 w-4" /> hello@reviewqr.in
              </a>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> Bengaluru, India
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Product</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
              <li><Link href="/r/demo-cafe" className="hover:text-foreground">Live demo</Link></li>
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
          <div>© {new Date().getFullYear()} ReviewQR. Made in India 🇮🇳</div>
          <div className="flex gap-4">
            <span>GST: 29ABCDE1234F1Z5</span>
            <span>·</span>
            <span>v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
