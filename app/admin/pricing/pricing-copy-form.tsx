"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/controls";
import { Input } from "@/components/admin/ui/controls";
import { Label } from "@/components/admin/ui/controls";
import { Textarea } from "@/components/admin/ui/controls";
import type { PricingCopy } from "@/lib/plans/pricing-copy";

export function PricingCopyForm({ initial }: { initial: PricingCopy }) {
  const [copy, setCopy] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/pricing-copy", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(copy)
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || "Could not save the pricing page");
      return;
    }
    toast.success("Pricing page saved");
  }

  return (
    <form onSubmit={save} className="space-y-6 rounded-xl border p-4">
      <div>
        <h2 className="font-display text-xl font-bold">Pricing page copy</h2>
        <p className="text-sm text-muted-foreground">
          Questions and the sticker comparison. The public pages read this on the next request.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Questions</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCopy({
                ...copy,
                faqs: [...copy.faqs, { qEn: "", qHi: "", aEn: "", aHi: "" }]
              })
            }
          >
            Add question
          </Button>
        </div>
        {copy.faqs.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor={`qEn-${index}`}>Question (English)</Label>
                <Input
                  id={`qEn-${index}`}
                  value={item.qEn}
                  required
                  onChange={(event) => {
                    const faqs = [...copy.faqs];
                    faqs[index] = { ...item, qEn: event.target.value };
                    setCopy({ ...copy, faqs });
                  }}
                />
              </div>
              <div>
                <Label htmlFor={`qHi-${index}`}>Question (Hindi)</Label>
                <Input
                  id={`qHi-${index}`}
                  value={item.qHi}
                  required
                  onChange={(event) => {
                    const faqs = [...copy.faqs];
                    faqs[index] = { ...item, qHi: event.target.value };
                    setCopy({ ...copy, faqs });
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`aEn-${index}`}>Answer (English)</Label>
              <Textarea
                id={`aEn-${index}`}
                value={item.aEn}
                required
                onChange={(event) => {
                  const faqs = [...copy.faqs];
                  faqs[index] = { ...item, aEn: event.target.value };
                  setCopy({ ...copy, faqs });
                }}
              />
            </div>
            <div>
              <Label htmlFor={`aHi-${index}`}>Answer (Hindi)</Label>
              <Textarea
                id={`aHi-${index}`}
                value={item.aHi}
                required
                onChange={(event) => {
                  const faqs = [...copy.faqs];
                  faqs[index] = { ...item, aHi: event.target.value };
                  setCopy({ ...copy, faqs });
                }}
              />
            </div>
            {copy.faqs.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCopy({ ...copy, faqs: copy.faqs.filter((_, itemIndex) => itemIndex !== index) })}
              >
                Remove question
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Sticker comparison</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCopy({
                ...copy,
                stickerRows: [...copy.stickerRows, { labelEn: "", labelHi: "", sticker: false, qr24x7: true }]
              })
            }
          >
            Add row
          </Button>
        </div>
        {copy.stickerRows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label htmlFor={`rowEn-${index}`}>Row (English)</Label>
              <Input
                id={`rowEn-${index}`}
                value={row.labelEn}
                required
                onChange={(event) => {
                  const stickerRows = [...copy.stickerRows];
                  stickerRows[index] = { ...row, labelEn: event.target.value };
                  setCopy({ ...copy, stickerRows });
                }}
              />
            </div>
            <div>
              <Label htmlFor={`rowHi-${index}`}>Row (Hindi)</Label>
              <Input
                id={`rowHi-${index}`}
                value={row.labelHi}
                required
                onChange={(event) => {
                  const stickerRows = [...copy.stickerRows];
                  stickerRows[index] = { ...row, labelHi: event.target.value };
                  setCopy({ ...copy, stickerRows });
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.sticker}
                  onChange={(event) => {
                    const stickerRows = [...copy.stickerRows];
                    stickerRows[index] = { ...row, sticker: event.target.checked };
                    setCopy({ ...copy, stickerRows });
                  }}
                />
                QR sticker
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.qr24x7}
                  onChange={(event) => {
                    const stickerRows = [...copy.stickerRows];
                    stickerRows[index] = { ...row, qr24x7: event.target.checked };
                    setCopy({ ...copy, stickerRows });
                  }}
                />
                QR24x7
              </label>
              {copy.stickerRows.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCopy({ ...copy, stickerRows: copy.stickerRows.filter((_, itemIndex) => itemIndex !== index) })
                  }
                >
                  Remove row
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save pricing page"}
      </Button>
    </form>
  );
}
