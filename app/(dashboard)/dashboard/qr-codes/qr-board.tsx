"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CodeScan } from "@/components/dashboard/code-scan";
import { codeFromScan } from "@/lib/tap/qr-stock";

type Location = { id: string; name: string };
type Business = { id: string; name: string; canManage: boolean; locations: Location[] };
type Item = {
  code: string;
  label: string;
  status: "ACTIVE" | "DISABLED" | "UNASSIGNED";
  scans: number;
  businessId: string;
  businessName: string;
  locationId: string | null;
  locationName: string | null;
};

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

function StatusBadge({ status }: { status: Item["status"] }) {
  if (status === "ACTIVE") return <Badge variant="success">Active</Badge>;
  if (status === "DISABLED") return <Badge variant="destructive">Disabled</Badge>;
  return <Badge variant="secondary">Unassigned</Badge>;
}

export function QrBoard({ businesses, items }: { businesses: Business[]; items: Item[] }) {
  const router = useRouter();
  const manageable = businesses.filter((business) => business.canManage);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState<{ code: string; enable: boolean } | null>(null);
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const [locations, setLocations] = React.useState<Record<string, string>>({});
  const [claimBusiness, setClaimBusiness] = React.useState(manageable[0]?.id || "");
  const [claimCode, setClaimCode] = React.useState("");
  const [claimLabel, setClaimLabel] = React.useState("");
  const [claimMessage, setClaimMessage] = React.useState("");
  const [claimReady, setClaimReady] = React.useState(false);
  const [needSupport, setNeedSupport] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const businessOf = React.useCallback(
    (id: string) => businesses.find((business) => business.id === id),
    [businesses]
  );

  async function patch(businessId: string, body: unknown) {
    const res = await fetch(`/api/businesses/${businessId}/qr`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not update the QR");
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the QR");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(item: Item, enable: boolean, confirmed: boolean) {
    if (!confirmed) {
      setPending({ code: item.code, enable });
      return;
    }
    await run(async () => {
      await patch(item.businessId, { action: enable ? "enable" : "disable", codes: [item.code] });
      setPending(null);
      toast.success(enable ? "QR enabled" : "QR disabled");
    });
  }

  async function bulk(enable: boolean) {
    const chosen = items.filter((item) => selected.includes(item.code) && businessOf(item.businessId)?.canManage);
    if (chosen.length === 0) return;
    await run(async () => {
      const groups = new Map<string, string[]>();
      for (const item of chosen) {
        groups.set(item.businessId, [...(groups.get(item.businessId) || []), item.code]);
      }
      for (const [businessId, codes] of groups) {
        await patch(businessId, { action: enable ? "enable" : "disable", codes });
      }
      setSelected([]);
      toast.success(enable ? "QR codes enabled" : "QR codes disabled");
    });
  }

  async function saveLabel(item: Item) {
    const label = labels[item.code] ?? item.label;
    await run(async () => {
      await patch(item.businessId, { action: "label", code: item.code, label });
      toast.success("Label saved");
    });
  }

  async function saveLocation(item: Item) {
    const locationId = locations[item.code] ?? item.locationId ?? "";
    await run(async () => {
      await patch(item.businessId, { action: "location", code: item.code, locationId: locationId || null });
      toast.success("Location saved");
    });
  }

  async function claim(confirm: boolean) {
    const code = codeFromScan(claimCode);
    if (!code || !claimBusiness) {
      toast.error("Enter the code printed on the QR");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${claimBusiness}/qr/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, confirm, label: claimLabel })
      });
      const json = await res.json().catch(() => ({}));
      if (json.needsConfirm) {
        setClaimMessage(json.message || json.error);
        setClaimReady(true);
        setNeedSupport(false);
        return;
      }
      if (!res.ok) {
        setClaimMessage(json.error || "Could not activate this QR");
        setClaimReady(false);
        setNeedSupport(json.support === true);
        return;
      }
      setClaimMessage(json.already ? "This QR is already active for this business" : "QR activated");
      setClaimReady(false);
      setNeedSupport(false);
      setClaimCode("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function requestMove() {
    const code = codeFromScan(claimCode);
    const business = businessOf(claimBusiness);
    if (!code || !business) return;
    setBusy(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: `Reassign QR ${code}`.slice(0, 120),
          body: `Please move QR ${code} to ${business.name} (${business.id}).`
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Could not open a support request");
        return;
      }
      toast.success("Support request sent");
      setNeedSupport(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {manageable.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="font-semibold">Activate a printed QR</h2>
            <label className="block space-y-1 text-sm">
              <span>Business</span>
              <select className="input min-h-[44px] w-full" value={claimBusiness} onChange={(event) => { setClaimBusiness(event.target.value); setClaimReady(false); }}>
                {manageable.map((business) => (
                  <option key={business.id} value={business.id}>{business.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Code</span>
              <Input className="min-h-[44px]" value={claimCode} onChange={(event) => { setClaimCode(event.target.value); setClaimReady(false); setNeedSupport(false); }} placeholder="Printed code or QR link" />
            </label>
            <CodeScan onCode={(code) => { setClaimCode(code); setClaimReady(false); }} />
            <label className="block space-y-1 text-sm">
              <span>Label</span>
              <Input className="min-h-[44px]" value={claimLabel} onChange={(event) => setClaimLabel(event.target.value)} placeholder="Counter, Table 4" />
            </label>
            {claimMessage ? <p className="text-sm">{claimMessage}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="min-h-[44px]" disabled={busy} onClick={() => claim(claimReady)}>
                {claimReady ? "Activate" : "Check code"}
              </Button>
              {needSupport ? (
                <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={requestMove}>
                  Request reassign
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => bulk(false)}>Disable selected</Button>
          <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => bulk(true)}>Enable selected</Button>
          <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => run(() => downloadPdf(selected))}>PDF</Button>
        </div>
      ) : null}

      {items.length === 0 ? <p className="text-sm text-muted-foreground">No QR codes match this filter.</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const business = businessOf(item.businessId);
          const canManage = business?.canManage === true;
          const asking = pending?.code === item.code;
          return (
            <Card key={item.code}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="font-mono text-xs text-muted-foreground">{item.code}</div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.businessName}
                  {item.locationName ? ` · ${item.locationName}` : ""}
                  {" · "}
                  {item.scans} scans
                </p>
                <div className="flex flex-wrap gap-2">
                  {canManage ? (
                    <label className="inline-flex min-h-[44px] items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.code)}
                        onChange={(event) => {
                          setSelected((current) => event.target.checked ? [...current, item.code] : current.filter((code) => code !== item.code));
                        }}
                      />
                      Select
                    </label>
                  ) : null}
                  <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                    <Link href={`/dashboard/qr-codes/${item.code}`}>View</Link>
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="min-h-[44px]" disabled={busy} onClick={() => run(() => downloadPdf([item.code]))}>PDF</Button>
                  {canManage ? (
                    <Button type="button" variant="outline" size="sm" className="min-h-[44px]" disabled={busy} onClick={() => setStatus(item, item.status === "DISABLED", asking)}>
                      {asking ? (pending.enable ? "Confirm enable" : "Confirm disable") : item.status === "DISABLED" ? "Enable" : "Disable"}
                    </Button>
                  ) : null}
                </div>
                {asking ? <p className="text-sm">{pending.enable ? "Enable this QR?" : "Disable this QR?"}</p> : null}
                {canManage ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input className="min-h-[44px]" value={labels[item.code] ?? item.label} onChange={(event) => setLabels((current) => ({ ...current, [item.code]: event.target.value }))} aria-label={`Label for ${item.code}`} />
                      <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => saveLabel(item)}>Save</Button>
                    </div>
                    {business && business.locations.length > 0 ? (
                      <div className="flex gap-2">
                        <select
                          className="input min-h-[44px] w-full"
                          aria-label={`Location for ${item.code}`}
                          value={locations[item.code] ?? item.locationId ?? ""}
                          onChange={(event) => setLocations((current) => ({ ...current, [item.code]: event.target.value }))}
                        >
                          <option value="">No location</option>
                          {business.locations.map((location) => (
                            <option key={location.id} value={location.id}>{location.name}</option>
                          ))}
                        </select>
                        <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => saveLocation(item)}>Move</Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
