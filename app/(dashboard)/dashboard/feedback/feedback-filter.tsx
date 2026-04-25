"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

const filters = [
  { key: "ALL", label: "All", href: "/dashboard/feedback" },
  { key: "NEW", label: "New", href: "/dashboard/feedback?status=new" },
  { key: "IN_PROGRESS", label: "In progress", href: "/dashboard/feedback?status=in_progress" },
  { key: "RESOLVED", label: "Resolved", href: "/dashboard/feedback?status=resolved" }
];

export function FeedbackFilter({ active }: { active: string }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      {filters.map((f) => (
        <Link
          key={f.key}
          href={f.href}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            active === f.key ? "bg-primary text-white" : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
        >
          {f.label}
        </Link>
      ))}
    </div>
  );
}
