"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { directCopy } from "@/lib/tap/direct";

export function DirectDevice({
  businessId,
  code,
  mode,
  target,
  opensEn,
  opensHi,
  options,
  canManage
}: {
  businessId: string;
  code: string;
  mode: string;
  target: string;
  opensEn: string;
  opensHi: string;
  options: { key: string; labelEn: string; labelHi: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const value = mode === "DIRECT" ? target : mode === "TAP_PAGE" ? "tap" : "inherit";

  async function change(next: string) {
    const body =
      next === "tap"
        ? { action: "direct", code, mode: "TAP_PAGE", target: "" }
        : next === "inherit"
          ? { action: "direct", code, mode: "INHERIT", target: "" }
          : { action: "direct", code, mode: "DIRECT", target: next };
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/qr`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not update the QR");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the QR");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{directCopy.en.badge(opensEn)}</Badge>
        <span className="text-xs text-muted-foreground" lang="hi">{directCopy.hi.badge(opensHi)}</span>
      </div>
      {canManage ? (
        <label className="block space-y-1 text-sm">
          <span>{directCopy.en.target}</span>
          <select
            className="input min-h-[44px] w-full"
            aria-label={`Opens for ${code}`}
            value={options.some((item) => item.key === value) || value === "tap" || value === "inherit" ? value : "inherit"}
            disabled={busy}
            onChange={(event) => change(event.target.value)}
          >
            <option value="inherit">{directCopy.en.inherit}</option>
            <option value="tap">{directCopy.en.tapPage}</option>
            {options.map((item) => (
              <option key={item.key} value={item.key}>{item.labelEn}</option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
