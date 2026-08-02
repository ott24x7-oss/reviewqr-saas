import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative min-h-screen bg-background flex items-center justify-center px-5">
      <div className="rounded-2xl border bg-card p-8 sm:p-12 max-w-md w-full text-center shadow-card">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <Search className="h-8 w-8" />
        </div>
        <div className="mt-6 font-display text-6xl font-bold gradient-text">404</div>
        <h1 className="mt-2 font-display text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link href="/" className="btn-primary btn-lg mt-6 inline-flex">
          <Home className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </main>
  );
}
