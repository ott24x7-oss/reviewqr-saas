"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  Star,
  QrCode,
  Send,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Bell,
  ChevronDown,
  Plus,
  ShieldCheck,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkToggle } from "@/lib/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import type { UserRole, SubscriptionTier } from "@prisma/client";

type Business = { id: string; name: string; slug: string; logo: string | null };
type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  tier: SubscriptionTier;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
};

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/businesses", label: "Businesses", icon: Building2 },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquare, badge: true },
  { href: "/dashboard/qr-codes", label: "QR Codes", icon: QrCode },
  { href: "/dashboard/ai", label: "AI Reviews", icon: Sparkles },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Send },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function DashboardShell({
  user,
  businesses,
  brand,
  children
}: {
  user: User;
  businesses: Business[];
  brand?: { name: string; logoUrl: string };
  children: React.ReactNode;
}) {
  const brandName = brand?.name || "ReviewQR";
  const brandLogo = brand?.logoUrl || "";
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { dark, toggle } = useDarkToggle();

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const trialDays = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div className={cn("min-h-screen flex flex-col", dark ? "dark bg-[#0b1220] text-slate-100" : "bg-transparent")}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b dark:border-slate-800 bg-white/95 dark:bg-slate-900/85 backdrop-blur-sm">
        <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 gap-2">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 font-bold">
              {brandLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
                  <Star className="h-4 w-4 fill-white text-white" />
                </span>
              )}
              <span className="font-display text-lg hidden sm:block">{brandName}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {(user.tier === "FREE" || user.tier === "GROWTH" && !user.subscriptionEndsAt) && (
              <Link
                href="/dashboard/billing"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium hover:bg-amber-100 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {trialDays > 0 ? `${trialDays} days left` : "Upgrade"}
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-white text-sm font-semibold">
                    {getInitials(user.name || user.email)}
                  </span>
                  <span className="hidden sm:flex flex-col items-start min-w-0">
                    <span className="text-sm font-medium truncate max-w-[140px]">
                      {user.name || user.email.split("@")[0]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{user.tier}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-xs text-muted-foreground">Signed in as</div>
                  <div className="font-medium truncate">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "ADMIN" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <ShieldCheck className="h-4 w-4 mr-2" /> Admin panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings"><Settings className="h-4 w-4 mr-2" /> Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/billing"><CreditCard className="h-4 w-4 mr-2" /> Billing</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex w-60 lg:w-64 border-r dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex-col">
          <nav className="flex-1 p-3 space-y-0.5">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(n.href, n.exact)
                    ? "bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="p-3 border-t">
            <div className="rounded-lg bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-500/10 dark:to-accent-500/10 p-3 text-xs">
              <div className="font-semibold text-foreground mb-1">Need help?</div>
              <p className="text-muted-foreground leading-relaxed">
                Email us at hello@reviewqr.in or check the docs.
              </p>
            </div>
          </div>
        </aside>

        {/* Sidebar - mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)}>
            <aside
              className="fixed left-0 top-14 bottom-0 w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 shadow-xl"
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
                        ? "bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300"
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

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="container max-w-7xl py-5 sm:py-7 px-3 sm:px-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden sticky bottom-0 z-30 border-t dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-5 safe-pb">
        {[
          { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
          { href: "/dashboard/reviews", label: "Reviews", icon: Star },
          { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquare },
          { href: "/dashboard/qr-codes", label: "QR", icon: QrCode },
          { href: "/dashboard/settings", label: "More", icon: Settings }
        ].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
              isActive(n.href, n.exact) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
