"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SHOP_ORDER_STATUSES,
  moveAllowed,
  shopStatusLabel,
  type ShopOrderStatusName
} from "@/lib/shop/order-status";

export type ProductionCard = {
  id: string;
  status: ShopOrderStatusName;
  businessName: string;
  anyLineNeedsNfc: boolean;
  lines: Array<{ id: string; name: string; hasProof: boolean }>;
};

const COLUMNS = SHOP_ORDER_STATUSES.filter((status) => status !== "PENDING_PAYMENT");

function adminTargets(from: ShopOrderStatusName, anyLineNeedsNfc: boolean) {
  return SHOP_ORDER_STATUSES.filter((to) => {
    if (to === "PROOF_SENT") return false;
    return moveAllowed(from, to, { actor: "admin", anyLineNeedsNfc, reprintApproved: false, comment: "" });
  });
}

export function ProductionBoard({ cards }: { cards: ProductionCard[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  async function readError(response: Response, fallback: string) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    return payload.error || fallback;
  }

  async function move(id: string, to: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/shop/orders/${id}/move`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to })
      });
      if (!response.ok) throw new Error(await readError(response, "Could not move the order"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move the order");
    } finally {
      setBusy(false);
    }
  }

  async function sendProof(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/shop/orders/${id}/proof`, { method: "POST" });
      if (!response.ok) throw new Error(await readError(response, "Could not send the proof"));
      toast.success("Proof sent");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the proof");
    } finally {
      setBusy(false);
    }
  }

  async function printSelected() {
    if (!selected.length) {
      toast.error("Choose an order to print");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/shop/orders/print", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selected })
      });
      if (!response.ok) throw new Error(await readError(response, "Could not build the print file"));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "shop-print.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the print file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" className="rounded-full bg-ink text-white hover:bg-ink/90" onClick={printSelected} disabled={busy}>
          Print approved designs
        </Button>
        <Button type="button" variant="outline" className="rounded-full" asChild>
          <Link href="/admin/production/nfc">NFC queue</Link>
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((status) => {
          const label = shopStatusLabel(status);
          const column = cards.filter((card) => card.status === status);
          return (
            <section key={status} aria-label={label} className="w-[260px] shrink-0 space-y-3 rounded-[20px] bg-white p-3">
              <h2 className="font-semibold text-ink">{label}</h2>
              {column.map((card) => (
                <article key={card.id} className="space-y-2 rounded-2xl border border-border p-3 text-sm text-ink">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      aria-label={`Select ${card.businessName}`}
                      checked={selected.includes(card.id)}
                      onChange={(event) => {
                        setSelected((current) =>
                          event.target.checked ? [...current, card.id] : current.filter((id) => id !== card.id)
                        );
                      }}
                    />
                    <span className="font-semibold">{card.businessName}</span>
                  </label>
                  {card.lines.map((line) => (
                    <p key={line.id}>
                      {line.name}
                      {line.hasProof && (
                        <>
                          {" "}
                          <a className="underline" href={`/api/admin/shop/orders/${card.id}/proof?line=${line.id}`}>
                            View proof
                          </a>
                        </>
                      )}
                    </p>
                  ))}
                  {(card.status === "PAID" || card.status === "CHANGES_REQUESTED") && (
                    <Button type="button" className="rounded-full bg-ink text-white hover:bg-ink/90" onClick={() => sendProof(card.id)} disabled={busy}>
                      Send proof
                    </Button>
                  )}
                  {adminTargets(card.status, card.anyLineNeedsNfc).map((to) => (
                    <Button key={to} type="button" variant="outline" className="rounded-full" onClick={() => move(card.id, to)} disabled={busy}>
                      Move to {shopStatusLabel(to)}
                    </Button>
                  ))}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
