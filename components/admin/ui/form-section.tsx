"use client";

import * as React from "react";

export function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-zinc-200 py-6 dark:border-zinc-800 md:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const fieldClass =
  "h-10 w-full rounded-[10px] border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function StickySave({ dirty, children }: { dirty: boolean; children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 mt-6 flex items-center justify-between gap-3 border-t border-zinc-200 bg-white/95 px-1 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <p className="text-sm text-zinc-500">{dirty ? "Unsaved changes" : "All changes saved"}</p>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
