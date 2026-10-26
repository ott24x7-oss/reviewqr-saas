export type AdminIcon =
  | "home"
  | "inbox"
  | "customers"
  | "businesses"
  | "payments"
  | "subscriptions"
  | "plans"
  | "referrals"
  | "agents"
  | "commissions"
  | "orders"
  | "catalogue"
  | "qr"
  | "print"
  | "nfc"
  | "shipping"
  | "reports"
  | "whatsapp"
  | "email"
  | "ai"
  | "site"
  | "branding"
  | "themes"
  | "presets"
  | "help"
  | "support"
  | "apps"
  | "audit"
  | "settings";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminIcon;
  exact?: boolean;
  badge?: "inbox";
};

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_PINNED: AdminNavItem[] = [
  { href: "/admin", label: "Home", icon: "home", exact: true },
  { href: "/admin/inbox", label: "Inbox", icon: "inbox", badge: "inbox" }
];

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Customers",
    items: [
      { href: "/admin/customers", label: "Owners", icon: "customers" },
      { href: "/admin/businesses", label: "Businesses", icon: "businesses" }
    ]
  },
  {
    label: "Revenue",
    items: [
      { href: "/admin/payments", label: "Payments", icon: "payments" },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: "subscriptions" },
      { href: "/admin/plans", label: "Plans & pricing", icon: "plans" },
      { href: "/admin/referrals", label: "Referrals", icon: "referrals" }
    ]
  },
  {
    label: "Partners",
    items: [
      { href: "/admin/agents", label: "Agents & teams", icon: "agents" },
      { href: "/admin/commissions", label: "Commissions & payouts", icon: "commissions" }
    ]
  },
  {
    label: "Hardware",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "orders" },
      { href: "/admin/catalogue", label: "Catalogue", icon: "catalogue" },
      { href: "/admin/tools", label: "Print & NFC tools", icon: "qr" }
    ]
  },
  {
    label: "Engage",
    items: [
      { href: "/admin/whatsapp", label: "WhatsApp", icon: "whatsapp" },
      { href: "/admin/email", label: "Email", icon: "email" },
      { href: "/admin/ai", label: "AI reviews", icon: "ai" }
    ]
  },
  {
    label: "Content",
    items: [
      { href: "/admin/site", label: "Website", icon: "site" },
      { href: "/admin/themes", label: "Tap themes", icon: "themes" },
      { href: "/admin/help", label: "Help centre", icon: "help" }
    ]
  },
  {
    label: "Support",
    items: [{ href: "/admin/support", label: "Tickets", icon: "support" }]
  },
  {
    label: "System",
    items: [
      { href: "/admin/apps", label: "Apps & devices", icon: "apps" },
      { href: "/admin/audit", label: "Audit log", icon: "audit" },
      { href: "/admin/settings", label: "Settings", icon: "settings" }
    ]
  }
];

export const ADMIN_PAGES: AdminNavItem[] = [...ADMIN_PINNED, ...ADMIN_NAV.flatMap((group) => group.items)];

export function adminCrumb(pathname: string) {
  const item = ADMIN_PAGES.find((entry) => (entry.exact ? pathname === entry.href : pathname === entry.href || pathname.startsWith(entry.href + "/")));
  const group = ADMIN_NAV.find((entry) => entry.items.some((child) => child.href === item?.href));
  return { group: group?.label || "Admin", page: item?.label || "Admin" };
}
