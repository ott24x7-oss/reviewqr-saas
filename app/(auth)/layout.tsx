import Link from "next/link";
import { Star } from "lucide-react";
import { getBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrand();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50/40 via-transparent to-accent-50/40">
      <header className="border-b bg-white/70 backdrop-blur-sm">
        <div className="container max-w-6xl flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand">
                <Star className="h-5 w-5 fill-white text-white" />
              </span>
            )}
            <span className="font-display text-xl">{brand.name}</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
