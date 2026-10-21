"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CodeScan } from "@/components/dashboard/code-scan";
import { codeFromScan } from "@/lib/tap/qr-stock";

type CodeRow = {
  code: string;
  label: string;
  status: "ACTIVE" | "DISABLED" | "UNASSIGNED";
  scans: number;
  businessId: string | null;
  businessName: string | null;
};
type Business = { id: string; name: string };

function StatusBadge({ status }: { status: CodeRow["status"] }) {
  if (status === "ACTIVE") return <Badge variant="success">Active</Badge>;
  if (status === "DISABLED") return <Badge variant="destructive">Disabled</Badge>;
  return <Badge variant="secondary">Unassigned</Badge>;
}

async function downloadPdf(codes: string[]) {
  const res = await fetch("/api/qr/pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ codes })
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Could not build the PDF");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = codes.length === 1 ? `qr-${codes[0]}.pdf` : "qr-codes.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function StockBoard({ codes, businesses }: { codes: CodeRow[]; businesses: Business[] }) {
  const router = useRouter();
  const [count, setCount] = React.useState(1);
  const [fresh, setFresh] = React.useState<string[]>([]);
  const [code, setCode] = React.useState("");
  const [businessId, setBusinessId] = React.useState(businesses[0]?.id || "");
  const [pending, setPending] = React.useState<{ code: string; action: string; businessId?: string; message: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Could not generate codes");
        return;
      }
      setFresh(json.codes || []);
      toast.success(`${json.codes?.length || 0} codes added to stock`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function act(nextCode: string, action: string, nextBusinessId?: string, confirm = false) {
    const scanned = codeFromScan(nextCode);
    if (!scanned) {
      toast.error("Enter a valid QR code");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/qr", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: scanned, action, businessId: nextBusinessId, confirm })
      });
      const json = await res.json().catch(() => ({}));
      if (json.needsConfirm) {
        setPending({ code: scanned, action, businessId: nextBusinessId, message: json.message || json.error });
        return;
      }
      if (!res.ok) {
        toast.error(json.error || "Could not update the QR");
        return;
      }
      setPending(null);
      toast.success("Saved");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Generate stock</h2>
          <label className="block space-y-1 text-sm">
            <span>How many</span>
            <Input className="min-h-[44px] max-w-[8rem]" type="number" min={1} max={100} value={count} onChange={(event) => setCount(Number(event.target.value))} />
          </label>
          <Button type="button" className="min-h-[44px]" disabled={busy} onClick={generate}>Generate</Button>
          {fresh.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm">{fresh.length} new codes</p>
              <p className="break-all font-mono text-xs">{fresh.join(", ")}</p>
              <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => downloadPdf(fresh).catch((error) => toast.error(error.message))}>
                Download batch PDF
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Assign a code</h2>
          <label className="block space-y-1 text-sm">
            <span>Code</span>
            <Input className="min-h-[44px]" value={code} onChange={(event) => { setCode(event.target.value); setPending(null); }} placeholder="Printed code or QR link" />
          </label>
          <CodeScan onCode={(value) => { setCode(value); setPending(null); }} />
          <label className="block space-y-1 text-sm">
            <span>Business</span>
            <select className="input min-h-[44px] w-full" value={businessId} onChange={(event) => setBusinessId(event.target.value)}>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>{business.name}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-[44px]" disabled={busy} onClick={() => act(code, "assign", businessId)}>Assign</Button>
            <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => act(code, "reassign", businessId)}>Reassign</Button>
            <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => act(code, "unassign")}>Unassign</Button>
            <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => act(code, "disable")}>Disable</Button>
            <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => act(code, "lost")}>Mark lost</Button>
            <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => act(code, "enable")}>Enable</Button>
          </div>
          {pending ? (
            <div className="space-y-2">
              <p className="text-sm">{pending.message}</p>
              <Button type="button" className="min-h-[44px]" disabled={busy} onClick={() => act(pending.code, pending.action, pending.businessId, true)}>
                Confirm
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {codes.map((row) => (
          <Card key={row.code}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-sm">{row.code}</div>
                  <div className="text-sm text-muted-foreground">{row.label}</div>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <p className="text-sm text-muted-foreground">{row.businessName || "In stock"} · {row.scans} scans</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                  <a href={`/api/qr/${row.code}/image?format=png`}>PNG</a>
                </Button>
                <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                  <a href={`/api/qr/${row.code}/image?format=svg`}>SVG</a>
                </Button>
                <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                  <a href={`/api/qr/${row.code}/image?format=pdf`}>PDF</a>
                </Button>
                <Button type="button" variant="outline" size="sm" className="min-h-[44px]" disabled={busy} onClick={() => { setCode(row.code); act(row.code, row.status === "DISABLED" ? "enable" : "disable"); }}>
                  {row.status === "DISABLED" ? "Enable" : "Disable"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {codes.length === 0 ? <p className="text-sm text-muted-foreground">No codes match this filter.</p> : null}
    </div>
  );
}
