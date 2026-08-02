import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative min-h-screen bg-canvas flex items-center justify-center px-5">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grad-hero" />
      <div className="neu rounded-3xl p-8 sm:p-12 max-w-md w-full text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          <Search className="h-8 w-8" />
        </div>
        <div className="mt-6 font-display text-6xl font-bold text-gradient">404</div>
        <h1 className="mt-2 font-display text-xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 h-11 text-sm font-medium text-on-primary shadow-glow transition hover:brightness-110 active:scale-[0.98]"
        >
          <Home className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </main>
  );
}
