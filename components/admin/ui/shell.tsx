"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Building2,
  CreditCard,
  Gift,
  Globe,
  History,
  Inbox,
  Layers,
  LifeBuoy,
  Link2,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  Nfc,
  Palette,
  Printer,
  QrCode,
  Settings,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sun,
  Truck,
  UserPlus,
  Users,
  Wallet,
  X,
  type LucideIcon
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { ADMIN_NAV, ADMIN_PINNED, adminCrumb, type AdminIcon } from "./nav";
import { CommandPalette } from "./command-palette";
import { FadeIn } from "./motion";

const ICONS: Record<AdminIcon, LucideIcon> = {
  home: BarChart3,
  inbox: Inbox,
  customers: Users,
  businesses: Building2,
  payments: CreditCard,
  subscriptions: Layers,
  plans: Layers,
  referrals: Gift,
  agents: UserPlus,
  commissions: Wallet,
  orders: ShoppingBag,
  catalogue: ShoppingBag,
  qr: QrCode,
  print: Printer,
  nfc: Nfc,
  shipping: Truck,
  reports: BarChart3,
  whatsapp: MessageCircle,
  email: Mail,
  ai: Sparkles,
  site: Globe,
  branding: Palette,
  themes: Palette,
  presets: Link2,
  help: LifeBuoy,
  support: LifeBuoy,
  apps: Smartphone,
  audit: History,
  settings: Settings
};

export function AdminShell({
  user,
  brand,
  inbox = 0,
  counts = {},
  envLabel,
  children
}: {
  user: { name: string | null; email: string; image: string | null };
  brand?: { name: string; logoUrl: string };
  inbox?: number;
  counts?: Record<string, number>;
  envLabel: "LIVE" | "STAGING";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const crumb = adminCrumb(pathname);

  React.useEffect(() => {
    const saved = window.localStorage.getItem("qr24-admin-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
    if (window.localStorage.getItem("qr24-admin-nav") === "collapsed") setCollapsed(true);
  }, []);

  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    let prefix = "";
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (typing) return;
      if (event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      const key = event.key.toLowerCase();
      if (prefix === "g" && key === "i") {
        prefix = "";
        router.push("/admin/inbox");
        return;
      }
      if (prefix === "g" && key === "c") {
        prefix = "";
        router.push("/admin/customers");
        return;
      }
      prefix = key === "g" ? "g" : "";
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("qr24-admin-theme", next);
  }

  function active(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  function item(entry: { href: string; label: string; icon: AdminIcon; exact?: boolean; badge?: "inbox" }, compact: boolean) {
    const Icon = ICONS[entry.icon];
    const on = active(entry.href, entry.exact);
    const count = entry.badge === "inbox" ? 0 : counts[entry.href] || 0;
    return (
      <Link
        key={entry.href}
        href={entry.href}
        title={entry.label}
        aria-current={on ? "page" : undefined}
        className={cn(
          "admin-nav-link flex items-center gap-2 rounded-[11px] px-2.5 py-2 text-sm",
          on ? "bg-emerald-600/10 font-medium text-emerald-700 dark:text-emerald-300" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {compact ? null : <span className="min-w-0 flex-1 truncate">{entry.label}</span>}
        {entry.badge === "inbox" && inbox > 0 ? (
          <span className="rounded-full bg-emerald-600 px-1.5 text-[11px] font-medium tabular-nums text-white">{inbox}</span>
        ) : null}
        {!compact && count > 0 ? <span className="text-[11px] tabular-nums text-zinc-400">{count}</span> : null}
      </Link>
    );
  }

  function navigation(compact: boolean) {
    return (
      <div className="flex h-full flex-col">
        <div className="admin-brand flex min-h-16 items-center gap-3 px-4 py-3 text-sm font-semibold">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-sm font-bold text-white shadow-md shadow-emerald-900/15">Q</div>
          {compact ? null : <div className="min-w-0"><div className="truncate">{brand?.name || "QR24x7"}</div><div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400">Control room</div></div>}
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
          <div className="space-y-0.5">{ADMIN_PINNED.map((entry) => item(entry, compact))}</div>
      {ADMIN_NAV.map((group) => (
            <div key={group.label}>
              {compact ? null : <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{group.label}</div>}
              <div className="space-y-0.5">{group.items.map((entry) => item(entry, compact))}</div>
            </div>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className={cn("admin-root text-zinc-950", theme === "dark" && "dark")}>
      <div className="admin-canvas-content flex min-h-screen dark:text-zinc-50">
        <aside className={cn("admin-sidebar sticky top-0 hidden h-screen shrink-0 flex-col border-r md:flex", collapsed ? "w-[68px]" : "w-[258px]")}>
          <div className="min-h-0 flex-1">{navigation(collapsed)}</div>
          <button
            type="button"
            className="admin-button m-2 rounded-[10px] border border-zinc-200 bg-white/60 px-2 py-1.5 text-xs text-zinc-500 dark:bg-zinc-950/60"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              window.localStorage.setItem("qr24-admin-nav", next ? "collapsed" : "open");
            }}
          >
            {collapsed ? ">" : "<"}
          </button>
        </aside>
        {open ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/40 md:hidden" onClick={() => setOpen(false)}>
            <aside className="admin-sidebar h-full w-72 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="absolute right-3 top-3" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
              {navigation(false)}
            </aside>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <header className="admin-topbar sticky top-0 z-30 flex h-[62px] items-center gap-2 border-b px-3 sm:px-5">
            <button type="button" className="admin-button inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-zinc-200 bg-white/70 md:hidden dark:bg-zinc-950/70" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden text-sm text-zinc-500 sm:block">
              <Link href="/admin" className="hover:text-zinc-950 dark:hover:text-white">
                {crumb.group}
              </Link>
              <span className="px-1">/</span>
              <span className="text-zinc-950 dark:text-zinc-50">{crumb.page}</span>
            </div>
            <button
              type="button"
              className="admin-input ml-auto inline-flex h-9 min-h-9 min-w-40 items-center gap-2 px-3 text-sm text-zinc-500 dark:bg-zinc-950/60 sm:min-w-52"
              onClick={() => setSearchOpen(true)}
            >
              Search
              <kbd className="ml-auto rounded border px-1 text-[10px]">K</kbd>
            </button>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${envLabel === "LIVE" ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"}`}>
              {envLabel}
            </span>
            <Link href="/admin/inbox" className="admin-button relative inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-zinc-200 bg-white/70 dark:bg-zinc-950/70" aria-label="Notifications">
              <Inbox className="h-4 w-4" />
              {inbox > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-emerald-600 px-1 text-[10px] text-white">{inbox}</span> : null}
            </Link>
            <button type="button" className="admin-button inline-flex h-9 w-9 items-center justify-center rounded-[11px] border border-zinc-200 bg-white/70 dark:bg-zinc-950/70" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="relative">
              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950" aria-label="Admin menu" onClick={() => setMenu((value) => !value)}>
                {getInitials(user.name || user.email)}
              </button>
              {menu ? (
                <div className="absolute right-0 mt-2 w-56 rounded-[14px] border border-zinc-200 bg-white p-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="px-2 py-1 text-zinc-500">{user.email}</div>
                  <Link href="/admin/_kit" className="block rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setMenu(false)}>
                    Component kit
                  </Link>
                  <Link href="/dashboard" className="block rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    Owner dashboard
                  </Link>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => signOut({ callbackUrl: "/" })}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </header>
          <FadeIn>
            <main className="px-3 py-5 sm:px-6">{children}</main>
          </FadeIn>
        </div>
      </div>
      {searchOpen ? <button type="button" className="fixed inset-0 z-40 bg-zinc-950/40" aria-label="Close search" onClick={() => setSearchOpen(false)} /> : null}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
