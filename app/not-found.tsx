import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { SiteShell } from "@/components/marketing/qr-site/ui";
import { getBrand } from "@/lib/brand";

export default async function NotFound() {
  const brand = await getBrand();
  return (
    <SiteShell brand={brand}>
      <section className="qr-notfound">
        <div className="qr-wrap">
          <div className="qr-notfound-card">
            <Search size={25} aria-hidden="true" />
            <p className="qr-notfound-code">404</p>
            <h1>Page not found</h1>
            <p>The page you’re looking for doesn’t exist or may have moved.</p>
            <Link href="/" className="qr-button qr-button-dark">Back to home <ArrowUpRight size={16} /></Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
