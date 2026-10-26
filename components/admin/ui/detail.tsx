"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { RelativeTime } from "./primitives";
import { useMotionSafe } from "./motion";

export function DetailLayout({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">{main}</div>
      <aside className="space-y-4 lg:sticky lg:top-20">{side}</aside>
    </div>
  );
}

export function MetaCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </section>
  );
}

export function Timeline({
  items
}: {
  items: { id: string; action: string; createdAt: string; reason?: string | null }[];
}) {
  if (!items.length) return <p className="text-sm text-zinc-500">No activity yet.</p>;
  return (
    <ol className="space-y-4 border-l border-zinc-200 pl-4 dark:border-zinc-800">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-emerald-600" />
          <div className="text-sm font-medium">{item.action}</div>
          {item.reason ? <p className="text-sm text-zinc-500">{item.reason}</p> : null}
          <div className="text-xs text-zinc-400">
            <RelativeTime value={item.createdAt} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Drawer({
  open,
  title,
  onClose,
  children,
  tabs
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
  tabs?: { id: string; label: string; body: React.ReactNode }[];
}) {
  const reduce = useMotionSafe();
  const [tab, setTab] = React.useState(tabs?.[0]?.id || "");
  if (!open) return null;
  const active = tabs?.find((item) => item.id === tab) || tabs?.[0];
  const panel = (
    <div className="flex h-full w-full max-w-md flex-col bg-white shadow-sm dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button type="button" className="text-sm text-zinc-500" onClick={onClose}>
          Close
        </button>
      </div>
      {tabs?.length ? (
        <div className="flex gap-2 border-b px-4 py-2">
          {tabs.map((item) => (
            <button key={item.id} type="button" className={`text-sm ${item.id === active?.id ? "font-medium" : "text-zinc-500"}`} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto p-4">{active ? active.body : children}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/40" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0" aria-label="Close drawer" onClick={onClose} />
      {reduce ? (
        <div className="relative h-full">{panel}</div>
      ) : (
        <motion.div className="relative h-full" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
          {panel}
        </motion.div>
      )}
    </div>
  );
}
