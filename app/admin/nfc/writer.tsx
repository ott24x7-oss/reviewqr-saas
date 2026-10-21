"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { codeFromScan } from "@/lib/tap/qr-stock";
import { decodeNdefUrl, nfcLinkMatches, nfcUrl, normalizeChipUid } from "@/lib/tap/nfc";

type ChipName = "NTAG213" | "NTAG215" | "NTAG216";
type QueueItem = { code: string; label: string };

type NdefRecord = { recordType: string; data?: DataView | BufferSource | string };
type NdefEvent = Event & { serialNumber?: string; message?: { records: NdefRecord[] } };
type NdefReader = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  write: (message: { records: { recordType: string; data: string }[] }) => Promise<void>;
  onreading: ((event: NdefEvent) => void) | null;
};

function webNfc() {
  const ctor = (window as Window & { NDEFReader?: new () => NdefReader }).NDEFReader;
  return ctor || null;
}

function recordText(record: NdefRecord) {
  if (typeof record.data === "string") return record.data;
  if (!record.data) return "";
  const view = ArrayBuffer.isView(record.data) ? new Uint8Array(record.data.buffer, record.data.byteOffset, record.data.byteLength) : new Uint8Array();
  if (record.recordType === "url") return decodeNdefUrl(view);
  return new TextDecoder().decode(view);
}

function waitForTap(reader: NdefReader) {
  return new Promise<{ url: string; uid: string }>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Tap the tag again to verify")), 20000);
    reader.onreading = (event) => {
      window.clearTimeout(timer);
      const url = (event.message?.records || []).map(recordText).join(" ");
      resolve({ url, uid: event.serialNumber || "" });
    };
  });
}

export function NfcWriter() {
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [index, setIndex] = React.useState(0);
  const [chip, setChip] = React.useState<ChipName>("NTAG213");
  const [bulk, setBulk] = React.useState(true);
  const [paste, setPaste] = React.useState("");
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [apple, setApple] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const stop = React.useRef(false);

  React.useEffect(() => {
    const phone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setApple(phone);
    setSupported(!phone && Boolean(webNfc()));
    fetch("/api/admin/nfc")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.devices)) setQueue(data.devices);
      })
      .catch(() => setMessage("Could not load unwritten tags"));
  }, []);

  const current = queue[index];
  const link = current && typeof window !== "undefined" ? nfcUrl(window.location.origin, current.code) : "";

  function addPasted() {
    const next = paste
      .split(/\s+/)
      .map((part) => codeFromScan(part))
      .filter((code): code is string => Boolean(code))
      .filter((code) => !queue.some((item) => item.code === code))
      .map((code) => ({ code, label: "" }));
    setQueue((items) => [...items, ...next]);
    setPaste("");
  }

  async function writeCode(item: QueueItem, reader: NdefReader) {
    const url = nfcUrl(window.location.origin, item.code);
    setMessage(`Hold the tag to write ${item.code}`);
    await reader.write({ records: [{ recordType: "url", data: url }] });
    setMessage("Tap the same tag again to verify");
    const read = await waitForTap(reader);
    if (!nfcLinkMatches(read.url, item.code)) {
      setMessage("The tag does not contain this code. It was not saved.");
      return false;
    }
    const uid = normalizeChipUid(read.uid);
    if (!uid) {
      setMessage("The link was written, but the chip UID could not be read.");
      return false;
    }
    const res = await fetch("/api/admin/nfc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: item.code, chipUid: uid, chip })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not save the chip");
      return false;
    }
    return true;
  }

  async function writeQueue() {
    const Reader = webNfc();
    if (!Reader || !current) return;
    setBusy(true);
    stop.current = false;
    const reader = new Reader();
    try {
      await reader.scan();
      let cursor = index;
      while (cursor < queue.length) {
        const ok = await writeCode(queue[cursor], reader);
        if (!ok || stop.current) return;
        cursor += 1;
        setIndex(cursor);
        if (!bulk) break;
      }
      setMessage(cursor >= queue.length ? "Queue finished" : "Verified");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The write failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">NFC writer</h1>
        <p className="text-sm text-muted-foreground">Write a tag, read it back, and save the chip UID.</p>
      </div>
      {supported === false ? (
        <div className="rounded-2xl border bg-white p-4 text-sm">
          <p>
            {apple
              ? "iPhone cannot write NFC tags from this browser."
              : "This browser cannot write NFC tags."}{" "}
            Use Chrome on Android, or the NFC Tools app on an iPhone or a desktop.
          </p>
          {link ? <p className="mt-2 break-all font-medium">{link}</p> : <p className="mt-2">Add a code, then paste its link into NFC Tools as a URL record.</p>}
        </div>
      ) : null}
      <label className="block text-sm font-medium">Chip
        <select className="input mt-1 min-h-11 w-full" value={chip} onChange={(event) => setChip(event.target.value as ChipName)}>
          <option value="NTAG213">NTAG213</option>
          <option value="NTAG215">NTAG215</option>
          <option value="NTAG216">NTAG216</option>
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={bulk} onChange={(event) => setBulk(event.target.checked)} />
        Write the next code on each tap
      </label>
      <div className="rounded-2xl border bg-white p-4">
        <p className="text-sm font-medium">{current ? `Next: ${current.code}` : "No codes in the queue"}</p>
        {current?.label ? <p className="text-sm text-muted-foreground">{current.label}</p> : null}
        {link ? <p className="mt-1 break-all text-xs text-muted-foreground">{link}</p> : null}
        <ol className="mt-3 max-h-48 space-y-1 overflow-auto text-sm">
          {queue.map((item, itemIndex) => (
            <li key={item.code} className={itemIndex === index ? "font-semibold" : itemIndex < index ? "text-muted-foreground line-through" : ""}>
              {item.label ? `${item.label} · ` : ""}{item.code}
            </li>
          ))}
        </ol>
      </div>
      <label className="block text-sm font-medium">Add codes
        <textarea className="input mt-1 min-h-24 w-full" value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="One code or /t/ link per line" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-11" onClick={addPasted}>Add</Button>
        <Button type="button" className="min-h-11" disabled={!supported || busy || !current} onClick={writeQueue}>
          {busy ? "Waiting for a tag" : "Write tag"}
        </Button>
        {busy ? <Button type="button" variant="outline" className="min-h-11" onClick={() => { stop.current = true; }}>Stop</Button> : null}
      </div>
      <p className="text-sm" aria-live="polite">{message}</p>
      <div className="rounded-2xl border bg-white p-4 text-sm">
        <p className="font-medium">Lock the tag</p>
        <p className="mt-1 text-muted-foreground">This page cannot lock a tag. After the link verifies, open NFC Tools, choose Other, then Lock tag, and confirm. A locked tag cannot be rewritten.</p>
      </div>
    </div>
  );
}
