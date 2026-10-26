"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard/agent", label: "Overview", exact: true },
  { href: "/dashboard/agent/team", label: "Team" },
  { href: "/dashboard/agent/earnings", label: "Earnings" },
  { href: "/dashboard/agent/payouts", label: "Payouts" },
  { href: "/dashboard/agent/profile", label: "Profile" },
  { href: "/dashboard/agent/how", label: "How it works" }
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
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
