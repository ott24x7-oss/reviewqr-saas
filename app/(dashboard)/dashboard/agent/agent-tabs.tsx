"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppText } from "@/components/app-ui/i18n";

const tabs = [
  { href: "/dashboard/agent", en: "Overview", hi: "अवलोकन", exact: true },
  { href: "/dashboard/agent/businesses", en: "Businesses", hi: "कारोबार" },
  { href: "/dashboard/agent/team", en: "Team", hi: "टीम" },
  { href: "/dashboard/agent/earnings", en: "Earnings", hi: "कमाई" },
  { href: "/dashboard/agent/payouts", en: "Payouts", hi: "भुगतान" },
  { href: "/dashboard/agent/profile", en: "Profile", hi: "प्रोफ़ाइल" },
  { href: "/dashboard/agent/how", en: "How it works", hi: "कमाई कैसे होती है" }
];

export function AgentTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto" aria-label="Agent">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${active ? "bg-primary text-primary-foreground" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <AppText en={tab.en} hi={tab.hi} />
          </Link>
        );
      })}
    </nav>
  );
}
