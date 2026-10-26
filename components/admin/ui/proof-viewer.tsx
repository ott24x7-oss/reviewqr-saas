"use client";

import * as React from "react";
import { ExternalLink, FileText } from "lucide-react";
import { AdminButton } from "./controls";
import { Drawer } from "./detail";

export function ProofViewerButton({ url, label = "View proof" }: { url: string; label?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <AdminButton type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileText className="h-4 w-4" /> {label}
      </AdminButton>
      <Drawer open={open} onClose={() => setOpen(false)} title="Order proof">
        <div className="flex h-[calc(100vh-6rem)] min-h-[28rem] flex-col gap-3">
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 self-end text-sm text-emerald-700 hover:underline dark:text-emerald-300">
            Open in new tab <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <iframe title="Order proof PDF" src={url} className="min-h-0 flex-1 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800" />
        </div>
      </Drawer>
    </>
  );
}
