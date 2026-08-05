"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Tag,
  CreditCard,
  Mail,
  MessageCircle,
  Globe,
  History,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/pricing", label: "Pricing", icon: Tag },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/email", label: "Email", icon: Mail },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/ai", label: "AI Reviews", icon: Sparkles },
  { href: "/admin/site", label: "Site Settings", icon: Globe },
  { href: "/admin/audit", label: "Audit Log", icon: History }
];

export function AdminShell({
  user,
  brand,
  children
}: {
  user: { name: string | null; email: string; image: string | null };
  brand?: { name: string; logoUrl: string };
  children: React.ReactNode;
}) {
  const brandName = brand?.name || "ReviewQR";
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  React.useEffect(() => setMobileOpen(false), [pathname]);
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-sm">
        <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 gap-2">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/admin" className="flex items-center gap-2 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="font-display text-lg">Admin</span>
            </Link>
            <span className="text-xs text-muted-foreground hidden sm:inline">/ {brandName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> User dashboard
            </Link>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-white text-sm font-semibold">
              {getInitials(user.name || user.email)}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="hidden md:flex w-60 lg:w-64 border-r bg-white shrink-0 flex-col">
          <nav className="flex-1 p-3 space-y-0.5">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(n.href, n.exact)
                    ? "bg-foreground text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/50"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className="fixed left-0 top-14 bottom-0 w-64 bg-white border-r shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="p-3 space-y-0.5">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(n.href, n.exact)
                        ? "bg-foreground text-white"
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                ))}
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <div className="container max-w-7xl py-5 sm:py-7 px-3 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
