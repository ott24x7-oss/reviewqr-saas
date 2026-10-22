"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CodeScan } from "@/components/dashboard/code-scan";
import { codeFromScan } from "@/lib/tap/qr-stock";
import { decodeNdefUrl } from "@/lib/tap/nfc";

type Business = { id: string; name: string };
type NdefRecord = { recordType: string; data?: DataView | BufferSource | string };
type NdefEvent = Event & { message?: { records: NdefRecord[] } };
type NdefReader = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: NdefEvent) => void) | null;
};

function recordText(record: NdefRecord) {
  if (typeof record.data === "string") return record.data;
  if (!record.data) return "";
  const view = ArrayBuffer.isView(record.data)
    ? new Uint8Array(record.data.buffer, record.data.byteOffset, record.data.byteLength)
    : new Uint8Array();
  if (record.recordType === "url") return decodeNdefUrl(view);
  return new TextDecoder().decode(view);
}

export function ActivateForm({ businesses: initial, initialCode }: { businesses: Business[]; initialCode: string }) {
  const router = useRouter();
  const [businesses, setBusinesses] = React.useState(initial);
  const [businessId, setBusinessId] = React.useState(initial[0]?.id || "");
  const [creating, setCreating] = React.useState(initial.length === 0);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState(initialCode);
  const [label, setLabel] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const [support, setSupport] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [nfc, setNfc] = React.useState<"unknown" | "yes" | "no" | "apple">("unknown");
  const stop = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (apple) setNfc("apple");
    else setNfc("NDEFReader" in window ? "yes" : "no");
    return () => stop.current?.abort();
  }, []);

  async function createBusiness() {
    const nextName = name.trim();
    if (nextName.length < 2) {
      setMessage("Enter a business name");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nextName })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.error || "Could not create the business");
        return;
      }
      const created = json.business as { id?: string; name?: string } | undefined;
      if (!created?.id || !created.name) {
        setMessage("Could not create the business");
        return;
      }
      setBusinesses((current) => [...current, { id: created.id as string, name: created.name as string }]);
      setBusinessId(created.id);
      setCreating(false);
      setName("");
      setMessage(`${created.name} is ready. Check the printed code.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function claim(confirm: boolean) {
    const printed = codeFromScan(code);
    if (!printed || !businessId) {
      setMessage("Enter the code printed on the QR");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/qr/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: printed, confirm, label })
      });
      const json = await res.json().catch(() => ({}));
      if (json.needsConfirm) {
        setMessage(json.message || json.error);
        setReady(true);
        setSupport(false);
        return;
      }
      if (!res.ok) {
        setMessage(json.error || "Could not activate this QR");
        setReady(false);
        setSupport(json.support === true);
        return;
      }
      setMessage(json.already ? "This QR is already active for this business" : "QR activated");
      setReady(false);
      setSupport(false);
      setCode("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function requestMove() {
    const printed = codeFromScan(code);
    const business = businesses.find((item) => item.id === businessId);
    if (!printed || !business) return;
    setBusy(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: `Reassign QR ${printed}`.slice(0, 120),
          body: `Please move QR ${printed} to ${business.name} (${business.id}).`
        })
      });
      const json = await res.json().catch(() => ({}));
      setMessage(res.ok ? "Support request sent" : json.error || "Could not open a support request");
      if (res.ok) setSupport(false);
    } finally {
      setBusy(false);
    }
  }

  async function readTag() {
    const Ctor = (window as Window & { NDEFReader?: new () => NdefReader }).NDEFReader;
    if (!Ctor) return;
    stop.current?.abort();
    const controller = new AbortController();
    stop.current = controller;
    setMessage("Hold the tag to the phone");
    try {
      const reader = new Ctor();
      await reader.scan({ signal: controller.signal });
      reader.onreading = (event) => {
        const text = (event.message?.records || []).map(recordText).join(" ");
        const found = codeFromScan(text);
        if (!found) {
          setMessage("The tag has no QR24x7 code");
          return;
        }
        setCode(found);
        setReady(false);
        setSupport(false);
        setMessage(`Code ${found} read. Check it, then activate.`);
        controller.abort();
      };
    } catch {
      if (!controller.signal.aborted) setMessage("Could not read the tag. Type the code instead.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Activate a tag</h1>
        <p className="text-sm text-muted-foreground">Scan a printed QR, or tap an NFC tag, then choose the business. The same code goes live. No new print is needed.</p>
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          {businesses.length > 0 ? (
            <label className="block space-y-1 text-sm">
              <span>Business</span>
              <select
                className="input min-h-[44px] w-full"
                value={businessId}
                onChange={(event) => {
                  setBusinessId(event.target.value);
                  setReady(false);
                }}
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>{business.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm">Create a business, then activate the printed code.</p>
          )}
          {businesses.length > 0 ? (
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setCreating((open) => !open)}>
              New business
            </Button>
          ) : null}
          {creating ? (
            <div className="space-y-2">
              <label className="block space-y-1 text-sm">
                <span>Business name</span>
                <Input className="min-h-[44px]" value={name} onChange={(event) => setName(event.target.value)} placeholder="Cafe name" />
              </label>
              <Button type="button" className="min-h-[44px]" disabled={busy} onClick={createBusiness}>Create business</Button>
            </div>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span>Code</span>
            <Input
              className="min-h-[44px]"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setReady(false);
                setSupport(false);
              }}
              placeholder="Printed code or QR link"
            />
          </label>
          <CodeScan onCode={(value) => { setCode(value); setReady(false); setSupport(false); }} />
          {nfc === "yes" ? (
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={readTag}>Read NFC tag</Button>
          ) : nfc === "apple" || nfc === "no" ? (
            <p className="text-sm text-muted-foreground">
              {nfc === "apple"
                ? "iPhone cannot read a tag from this page. Tap the tag to open it, or type the printed code. The NFC Tools app can read the link."
                : "This browser cannot read a tag. Tap the tag to open it, or type the printed code. On a desktop, use the NFC Tools app."}
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span>Label</span>
            <Input className="min-h-[44px]" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Counter, Table 4" />
          </label>
          {message ? <p className="text-sm">{message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-[44px]" disabled={busy || !businessId} onClick={() => claim(ready)}>
              {ready ? "Activate" : "Check code"}
            </Button>
            {support ? (
              <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={requestMove}>
                Request reassign
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
