"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { ADMIN_PAGES } from "./nav";
import { searchAdminCommand } from "@/app/admin/command-search";

type Hit = { id: string; label: string; hint: string; href: string };

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<{ users: Hit[]; businesses: Hit[]; payments: Hit[]; agents: Hit[]; orders: Hit[] }>({
    users: [],
    businesses: [],
    payments: [],
    agents: [],
    orders: []
  });

  React.useEffect(() => {
    if (!open || query.trim().length < 2) {
      setHits({ users: [], businesses: [], payments: [], agents: [], orders: [] });
      return;
    }
    const handle = window.setTimeout(() => {
      searchAdminCommand(query.trim()).then((result) => {
        setHits({
          users: result.users.map((row) => ({ id: row.id, label: row.name || row.email || "Owner", hint: row.email || "", href: `/admin/customers/${row.id}` })),
          businesses: result.businesses.map((row) => ({ id: row.id, label: row.name, hint: row.slug, href: `/admin/businesses/${row.id}` })),
          payments: result.payments.map((row) => ({ id: row.id, label: row.invoiceNumber || row.id, hint: row.status, href: `/admin/payments/${row.id}` })),
          agents: result.agents.map((row) => ({ id: row.id, label: row.name, hint: row.code, href: `/admin/agents/${row.id}` })),
          orders: result.orders.map((row) => ({ id: row.id, label: row.invoiceNumber || row.id, hint: row.status, href: `/admin/production` }))
        });
      }).catch(() => undefined);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Admin search"
      className="fixed left-1/2 top-[12vh] z-50 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[14px] border border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search pages, customers, businesses, payments, agents, orders"
        className="h-12 w-full border-b border-zinc-200 bg-transparent px-4 text-sm outline-none dark:border-zinc-800"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-sm text-zinc-500">No matches.</Command.Empty>
        <Command.Group heading="Pages" className="px-2 py-1 text-xs text-zinc-500">
          {ADMIN_PAGES.map((page) => (
            <Command.Item key={page.href} value={`${page.label} page`} onSelect={() => go(page.href)} className="cursor-pointer rounded-lg px-2 py-2 text-sm aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800">
              {page.label}
            </Command.Item>
          ))}
        </Command.Group>
        <HitGroup heading="Customers" hits={hits.users} onSelect={go} />
        <HitGroup heading="Businesses" hits={hits.businesses} onSelect={go} />
        <HitGroup heading="Payments" hits={hits.payments} onSelect={go} />
        <HitGroup heading="Agents" hits={hits.agents} onSelect={go} />
        <HitGroup heading="Orders" hits={hits.orders} onSelect={go} />
      </Command.List>
      <div className="flex gap-3 border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
        <span>↑↓ select</span>
        <span>↵ open</span>
        <span>esc close</span>
      </div>
    </Command.Dialog>
  );
}

function HitGroup({ heading, hits, onSelect }: { heading: string; hits: Hit[]; onSelect: (href: string) => void }) {
  if (!hits.length) return null;
  return (
    <Command.Group heading={heading} className="px-2 py-1 text-xs text-zinc-500">
      {hits.map((hit) => (
        <Command.Item key={hit.id} value={`${hit.label} ${hit.hint}`} onSelect={() => onSelect(hit.href)} className="cursor-pointer rounded-lg px-2 py-2 text-sm aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800">
          <span className="font-medium">{hit.label}</span>
          <span className="ml-2 text-zinc-500">{hit.hint}</span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}
