import Link from "next/link";
import { Star } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50/50 via-white to-accent-50/50">
      <header className="border-b bg-white/70 backdrop-blur-sm">
        <div className="container max-w-6xl flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand">
              <Star className="h-5 w-5 fill-white text-white" />
            </span>
            <span className="font-display text-xl">ReviewQR</span>
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
