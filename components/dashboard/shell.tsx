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
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return d.toLocaleDateString();
}
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
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setNotifications(Array.isArray(data.items) ? data.items : []);
        setUnread(typeof data.unread === "number" ? data.unread : 0);
      } catch {
        // ignore transient fetch errors
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleNotificationsOpen = (open: boolean) => {
    if (open && unread > 0) {
      fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const trialDays = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
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
            {(user.tier === "FREE" || user.tier === "GROWTH" && !user.subscriptionEndsAt) && (
              <Link
                href="/dashboard/billing"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium hover:bg-amber-100 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {trialDays > 0 ? `${trialDays} days left` : "Upgrade"}
              </Link>
            )}

            <DropdownMenu onOpenChange={handleNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="px-3 py-2 border-b font-medium text-sm">Notifications</div>
                {notifications.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No notifications yet.
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link || "#"}
                        className={cn(
                          "block px-3 py-2.5 border-b last:border-b-0 hover:bg-secondary transition-colors",
                          !n.isRead && "bg-secondary/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium leading-snug">{n.title}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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
