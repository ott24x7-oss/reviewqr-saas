"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeProvider, useTheme } from "next-themes";
import { MotionConfig, motion } from "framer-motion";
import {
  Activity, BarChart3, Bell, Building2, Check, ChevronDown, CircleHelp,
  CreditCard, Gift, LayoutDashboard, LifeBuoy, LockKeyhole, Menu, MessageSquare,
  Moon, Package, QrCode, Search, Settings, ShoppingBag, Sparkles, Star, Sun,
  Users, X, type LucideIcon
} from "lucide-react";
import { Toaster } from "sonner";
import type { SubscriptionTier, UserRole } from "@prisma/client";
import { getInitials, cn } from "@/lib/utils";
import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";
import { AppLanguageProvider, useAppLanguage } from "./i18n";
import { FinishAccountCard } from "./finish-account-card";
import "./tokens.css";

type Business = { id: string; name: string; slug: string; logo: string | null };
type Notice = { id: string; title: string; message: string; link: string | null; isRead: boolean; createdAt: string };
type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  tier: SubscriptionTier;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  emailVerified?: boolean;
};

type NavItem = { href: string; key: string; icon: LucideIcon; exact?: boolean };
type NavGroup = { key: string; items: NavItem[] };

const ownerGroups: NavGroup[] = [
  { key: "home", items: [{ href: "/dashboard", key: "home", icon: LayoutDashboard, exact: true }] },
  { key: "sell", items: [
    { href: "/dashboard/sell/orders", key: "orders", icon: ShoppingBag },
    { href: "/dashboard/sell/menu", key: "menu", icon: Package },
    { href: "/dashboard/sell/customers", key: "customers", icon: Users },
    { href: "/dashboard/sell/campaigns", key: "campaigns", icon: Activity }
  ] },
  { key: "reputation", items: [
    { href: "/dashboard/reputation/reviews", key: "reviews", icon: Star },
    { href: "/dashboard/reputation/feedback", key: "feedback", icon: MessageSquare },
    { href: "/dashboard/reputation/ai-replies", key: "aiReplies", icon: Sparkles }
  ] },
  { key: "pageQr", items: [
    { href: "/dashboard/page", key: "myPage", icon: Building2 },
    { href: "/dashboard/page/qr", key: "qrCodes", icon: QrCode },
    { href: "/dashboard/page/print", key: "printStands", icon: Package }
  ] },
  { key: "insights", items: [{ href: "/dashboard/insights", key: "analytics", icon: BarChart3 }] },
  { key: "account", items: [
    { href: "/dashboard/account/plan", key: "billing", icon: CreditCard },
    { href: "/dashboard/account/refer", key: "refer", icon: Gift },
    { href: "/dashboard/account/settings", key: "settings", icon: Settings },
    { href: "/dashboard/account/help", key: "help", icon: LifeBuoy }
  ] }
];

const agentGroup: NavGroup = { key: "agent", items: [
  { href: "/dashboard/agent", key: "agentHome", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/agent/businesses", key: "agentBusinesses", icon: Building2 },
  { href: "/dashboard/agent/team", key: "team", icon: Users },
  { href: "/dashboard/agent/earnings", key: "earnings", icon: Activity },
  { href: "/dashboard/agent/payouts", key: "payouts", icon: CreditCard },
  { href: "/dashboard/agent/profile", key: "profile", icon: Settings }
] };

const labels: Record<string, [string, string]> = {
  home: ["Home", "होम"], sell: ["Sell", "बेचें"], orders: ["Orders", "ऑर्डर"], menu: ["Menu & products", "मेन्यू और उत्पाद"],
  customers: ["Customers", "ग्राहक"], campaigns: ["Offers & campaigns", "ऑफ़र और अभियान"], reputation: ["Reputation", "समीक्षा"],
  reviews: ["Reviews", "रिव्यू"], feedback: ["Feedback", "फ़ीडबैक"], aiReplies: ["AI replies", "AI जवाब"],
  pageQr: ["Page & QR", "पेज और QR"], myPage: ["My page", "मेरा पेज"], qrCodes: ["QR codes & NFC", "QR कोड और NFC"],
  printStands: ["Print & order stands", "प्रिंट और स्टैंड"], insights: ["Insights", "जानकारी"], analytics: ["Analytics", "एनालिटिक्स"],
  account: ["Account", "खाता"], billing: ["Plan & billing", "प्लान और बिलिंग"], refer: ["Refer & earn", "रेफ़र करें और कमाएँ"],
  settings: ["Settings", "सेटिंग"], help: ["Help", "मदद"], agent: ["Agent", "एजेंट"],
  agentHome: ["Agent home", "एजेंट होम"], agentBusinesses: ["Businesses", "कारोबार"], team: ["Team", "टीम"], earnings: ["Earnings", "कमाई"],
  payouts: ["Payouts", "भुगतान"], profile: ["Profile", "प्रोफ़ाइल"]
};

function translatedLabel(key: string, text: (english: string, hindi: string) => string) {
  const [en, hi] = labels[key] || [key, key];
  return text(en, hi);
}

function ThemeAndLanguageControls() {
  const { resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage, text } = useAppLanguage();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="app-ui-focus inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={dark ? text("Switch to light theme", "हल्की थीम चुनें") : text("Switch to dark theme", "गहरी थीम चुनें")}
        onClick={() => setTheme(dark ? "light" : "dark")}
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <button
        type="button"
        className="app-ui-focus inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={text("Change language", "भाषा बदलें")}
        onClick={() => setLanguage(language === "en" ? "hi" : "en")}
      >
        {language === "en" ? "हि" : "EN"}
      </button>
    </div>
  );
}

function NavGroups({ groups, pathname, close }: { groups: NavGroup[]; pathname: string; close?: () => void }) {
  const { text } = useAppLanguage();
  const isActive = (item: NavItem) => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <nav className="space-y-5" aria-label={text("Main navigation", "मुख्य नेविगेशन")}>
      {groups.map((group) => (
        <section key={group.key} aria-label={translatedLabel(group.key, text)}>
          {group.key !== "home" ? <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{translatedLabel(group.key, text)}</p> : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={isActive(item) ? "page" : undefined}
                  className={cn(
                    "app-ui-focus flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                    isActive(item) ? "bg-primary/10 font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive(item) && "text-primary")} />
                  <span className="min-w-0 flex-1 truncate">{translatedLabel(item.key, text)}</span>
                  {isActive(item) ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function BusinessSwitcher({ businesses, pathname }: { businesses: Business[]; pathname: string }) {
  const router = useRouter();
  const { text } = useAppLanguage();
  const [businessId, setBusinessId] = React.useState("");
  React.useEffect(() => {
    const saved = window.localStorage.getItem("qr24x7.active-business") || "";
    setBusinessId(saved);
  }, []);
  if (businesses.length === 0) return null;
  function choose(id: string) {
    setBusinessId(id);
    window.localStorage.setItem("qr24x7.active-business", id);
    const query = new URLSearchParams(window.location.search);
    if (id) query.set("businessId", id);
    else query.delete("businessId");
    const suffix = query.toString();
    router.push(pathname + (suffix ? "?" + suffix : ""));
  }
  return (
    <label className="block">
      <span className="sr-only">{text("Business", "कारोबार")}</span>
      <select
        value={businessId}
        onChange={(event) => choose(event.target.value)}
        className="app-ui-focus h-10 w-full min-w-0 rounded-md border bg-card px-3 text-sm font-medium outline-none"
      >
        <option value="">{text("Choose a business", "कारोबार चुनें")}</option>
        {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
      </select>
    </label>
  );
}

function CommandSearch({ open, setOpen, groups }: { open: boolean; setOpen: (open: boolean) => void; groups: NavGroup[] }) {
  const router = useRouter();
  const { text } = useAppLanguage();
  const [query, setQuery] = React.useState("");
  const items = groups.flatMap((group) => group.items.map((item) => ({ ...item, label: translatedLabel(item.key, text) })));
  const filtered = items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  const searchQuery = query.trim();
  function go(href: string) {
    router.push(href);
    setOpen(false);
  }
  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);
  React.useEffect(() => {
    if (!open) return;
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, setOpen]);
  return (
    <div className={cn("fixed inset-0 z-[70] grid place-items-start bg-black/35 px-3 pt-[12vh] transition-opacity", open ? "visible opacity-100" : "pointer-events-none invisible opacity-0")} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label={text("Search QR24x7", "QR24x7 में खोजें")} className="app-ui-popover w-full max-w-xl overflow-hidden rounded-lg border bg-popover text-popover-foreground">
        <label className="flex h-12 items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text("Search pages, orders, customers and reviews", "पेज, ऑर्डर, ग्राहक और रिव्यू खोजें")} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <kbd className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </label>
        <div className="max-h-[min(60vh,460px)] overflow-y-auto p-2">
          {filtered.length ? (
            <>
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{text("Pages", "पेज")}</p>
              {filtered.map((item) => (
                <button key={item.href} type="button" onClick={() => go(item.href)} className="app-ui-focus flex min-h-10 w-full items-center gap-3 rounded-md px-2 text-left text-sm hover:bg-muted">
                  <item.icon className="h-4 w-4 text-muted-foreground" /> {item.label}
                </button>
              ))}
            </>
          ) : null}
          {searchQuery.length >= 2 ? (
            <>
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{text("Search records", "रिकॉर्ड खोजें")}</p>
              {[
                ["/dashboard/sell/orders?search=" + encodeURIComponent(searchQuery), text("Orders", "ऑर्डर")],
                ["/dashboard/sell/customers?search=" + encodeURIComponent(searchQuery), text("Customers", "ग्राहक")],
                ["/dashboard/reputation/reviews?search=" + encodeURIComponent(searchQuery), text("Reviews", "रिव्यू")]
              ].map(([href, label]) => (
                <button key={href} type="button" onClick={() => go(href)} className="app-ui-focus flex min-h-10 w-full items-center justify-between rounded-md px-2 text-left text-sm hover:bg-muted">
                  <span>{label}</span><span className="text-xs text-muted-foreground">{searchQuery}</span>
                </button>
              ))}
            </>
          ) : null}
          {!filtered.length && searchQuery.length < 2 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">{text("Type to search", "खोजने के लिए लिखें")}</p> : null}
        </div>
        <footer className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground"><span>{text("Use arrows to move, Enter to open", "जाने के लिए तीर, खोलने के लिए Enter")}</span><span>⌘ K</span></footer>
      </section>
    </div>
  );
}

function AppShellContent({
  user, businesses, brand, impersonation, children
}: {
  user: User;
  businesses: Business[];
  brand?: { name: string; logoUrl: string };
  impersonation?: { exp: number } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { text } = useAppLanguage();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notice[]>([]);
  const [unread, setUnread] = React.useState(0);
  const brandName = brand?.name || "QR24x7";
  const navGroups = user.role === "AGENT" ? [ownerGroups[0], agentGroup, ...ownerGroups.slice(1)] : ownerGroups;

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/notifications");
        if (!response.ok) return;
        const data = await response.json();
        if (active) {
          setNotifications(Array.isArray(data.items) ? data.items : []);
          setUnread(typeof data.unread === "number" ? data.unread : 0);
        }
      } catch {
        // A failed refresh leaves the last notification list visible.
      }
    }
    void load();
    const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const logo = brand?.logoUrl || "/brand/icon-192.png";
  const trialDays = user.trialEndsAt ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / 86400000)) : 0;
  const mobileShortcuts = [
    { href: "/dashboard", key: "home", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/sell/orders", key: "orders", icon: ShoppingBag },
    { href: "/dashboard/reputation/reviews", key: "reviews", icon: Star },
    { href: "/dashboard/page/qr", key: "qrCodes", icon: QrCode },
    { href: "/dashboard/account/settings", key: "settings", icon: Settings }
  ];

  function markRead() {
    if (!unread) return;
    void fetch("/api/notifications/read", { method: "POST" });
    setUnread(0);
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
  }

  return (
    <div className="app-dashboard flex min-h-screen flex-col bg-background text-foreground">
      <Toaster richColors position="top-right" />
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b bg-card px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button type="button" className="app-ui-focus inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted md:hidden" aria-label={text("Open navigation", "नेविगेशन खोलें")} onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex min-h-10 min-w-0 items-center gap-2.5 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" className="h-8 w-8 rounded-md object-cover" />
            <span className="hidden truncate text-sm sm:block">{brandName}</span>
          </Link>
          <div className="hidden w-52 lg:block"><BusinessSwitcher businesses={businesses} pathname={pathname} /></div>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <button type="button" className="app-ui-focus flex h-10 min-w-10 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:bg-muted sm:w-64" onClick={() => setSearchOpen(true)} aria-label={text("Search", "खोजें")}>
            <Search className="h-4 w-4 shrink-0" /><span className="hidden flex-1 truncate text-left sm:block">{text("Search anything", "कुछ भी खोजें")}</span><kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] sm:block">⌘ K</kbd>
          </button>
          <div className="relative">
            <button type="button" className="app-ui-focus relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted" aria-label={text("Notifications", "सूचनाएँ")} onClick={() => { markRead(); router.push("/dashboard/notifications"); }}>
              <Bell className="h-4 w-4" />
              {unread > 0 ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">{unread > 9 ? "9+" : unread}</span> : null}
            </button>
          </div>
          <ThemeAndLanguageControls />
          <div className="hidden h-8 w-px bg-border sm:block" />
          <button type="button" className="app-ui-focus inline-flex h-10 items-center gap-2 rounded-md px-2 hover:bg-muted" onClick={() => signOut({ callbackUrl: "/" })} aria-label={text("Sign out", "साइन आउट")}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{getInitials(user.name || user.email)}</span>
            <span className="hidden max-w-32 truncate text-left text-sm sm:block">{user.name || user.email.split("@")[0]}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[248px] shrink-0 overflow-y-auto border-r bg-card p-3 md:block">
          {businesses.length ? <div className="mb-4 px-1 lg:hidden"><BusinessSwitcher businesses={businesses} pathname={pathname} /></div> : null}
          <NavGroups groups={navGroups} pathname={pathname} />
          <div className="mt-6 border-t pt-4">
            {(user.tier === "FREE" || (user.tier === "GROWTH" && !user.subscriptionEndsAt)) ? (
              <Link href="/dashboard/account/plan" className="flex min-h-10 items-center justify-between rounded-md bg-primary/10 px-3 text-sm font-medium hover:bg-primary/15">
                <span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-primary" />{trialDays > 0 ? text(trialDays + " days left", trialDays + " दिन शेष") : text("View plans", "प्लान देखें")}</span>
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
              </Link>
            ) : null}
            <Link href="/dashboard/account/help" className="mt-2 flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <CircleHelp className="h-4 w-4" />{text("Need help?", "मदद चाहिए?")}
            </Link>
          </div>
        </aside>

        <motion.main initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }} className="min-w-0 flex-1 pb-20 md:pb-8">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            {impersonation ? (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <span>{text("You are viewing this account as an admin.", "आप इस खाते को एडमिन के रूप में देख रहे हैं।")}</span>
                <button type="button" className="app-ui-focus min-h-9 rounded-md px-3 font-medium underline" onClick={async () => { await fetch("/api/admin/impersonate", { method: "DELETE" }); window.location.href = "/admin"; }}>
                  {text("Return to admin", "एडमिन पर लौटें")}
                </button>
              </div>
            ) : null}
            {pathname === "/dashboard" ? <FinishAccountCard emailVerified={user.emailVerified !== false} /> : null}
            <AnnouncementBanner />
            {children}
          </div>
        </motion.main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileOpen(false); }}>
          <motion.aside initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} className="h-full w-[min(22rem,88vw)] overflow-y-auto border-r bg-card p-4" aria-label={text("Navigation drawer", "नेविगेशन")}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <strong>{brandName}</strong>
              <button type="button" className="app-ui-focus inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted" aria-label={text("Close navigation", "नेविगेशन बंद करें")} onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="mb-4"><BusinessSwitcher businesses={businesses} pathname={pathname} /></div>
            <NavGroups groups={navGroups} pathname={pathname} close={() => setMobileOpen(false)} />
          </motion.aside>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label={text("Quick navigation", "त्वरित नेविगेशन")}>
        {mobileShortcuts.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          return <Link key={item.href} href={item.href} className={cn("app-ui-focus flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
            <item.icon className="h-5 w-5" /><span>{translatedLabel(item.key, text)}</span>
          </Link>;
        })}
      </nav>

      <CommandSearch open={searchOpen} setOpen={setSearchOpen} groups={navGroups} />
    </div>
  );
}

export function AppShell({
  user,
  businesses,
  brand,
  impersonation,
  children
}: {
  user: User;
  businesses: Business[];
  brand?: { name: string; logoUrl: string };
  impersonation?: { exp: number } | null;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="qr24x7-owner-theme">
      <MotionConfig reducedMotion="user">
        <AppLanguageProvider>
          <AppShellContent user={user} businesses={businesses} brand={brand} impersonation={impersonation}>{children}</AppShellContent>
        </AppLanguageProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
