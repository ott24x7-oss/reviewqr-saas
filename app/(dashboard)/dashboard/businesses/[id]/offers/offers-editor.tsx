"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type OfferCoupon = {
  id: string;
  code: string;
  kind: "PERCENT" | "FLAT";
  amount: number;
  minRupees: number;
  expiresOn: string;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
};

export type OfferBannerRow = {
  id: string;
  title: string;
  body: string;
  active: boolean;
};

export function OffersEditor({
  businessId,
  businessName,
  canEdit,
  coupons,
  banners
}: {
  businessId: string;
  businessName: string;
  canEdit: boolean;
  coupons: OfferCoupon[];
  banners: OfferBannerRow[];
}) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [kind, setKind] = React.useState<"PERCENT" | "FLAT">("PERCENT");
  const [amount, setAmount] = React.useState("");
  const [minRupees, setMinRupees] = React.useState("");
  const [expiresOn, setExpiresOn] = React.useState("");
  const [usageLimit, setUsageLimit] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/offers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save the offer");
      toast.success("Offer saved");
      router.refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the offer");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold sm:text-2xl">Offers</h1>
        <p className="text-sm text-muted-foreground">{businessName}. These are store discounts, not a reward for a public review.</p>
      </div>
      {!canEdit ? <p className="text-sm text-muted-foreground">Only a manager can change offers.</p> : null}
      {canEdit ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Coupon</p>
            <Input aria-label="Coupon code" value={code} placeholder="Code, e.g. SAVE10" onChange={(event) => setCode(event.target.value)} className="min-h-11" />
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Discount type" value={kind} onChange={(event) => setKind(event.target.value as "PERCENT" | "FLAT")} className="flex h-11 w-full rounded-lg border bg-white px-3 text-sm">
                <option value="PERCENT">Percent off</option>
                <option value="FLAT">Rupees off</option>
              </select>
              <Input aria-label="Discount amount" value={amount} inputMode="decimal" placeholder={kind === "PERCENT" ? "Percent" : "Rupees off"} onChange={(event) => setAmount(event.target.value)} className="min-h-11" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input aria-label="Minimum order in rupees" value={minRupees} inputMode="decimal" placeholder="Minimum order ₹" onChange={(event) => setMinRupees(event.target.value)} className="min-h-11" />
              <Input aria-label="Usage limit" value={usageLimit} inputMode="numeric" placeholder="Use limit (blank = no limit)" onChange={(event) => setUsageLimit(event.target.value)} className="min-h-11" />
            </div>
            <Input aria-label="Expiry date" type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} className="min-h-11" />
            <Button
              type="button"
              disabled={busy}
              className="min-h-11"
              onClick={async () => {
                const saved = await send({
                  action: "coupon",
                  code,
                  kind,
                  amount: Number(amount),
                  minRupees: minRupees ? Number(minRupees) : 0,
                  expiresOn: expiresOn || null,
                  usageLimit: usageLimit ? Number(usageLimit) : null
                });
                if (saved) {
                  setCode("");
                  setAmount("");
                  setMinRupees("");
                  setExpiresOn("");
                  setUsageLimit("");
                }
              }}
            >
              Add coupon
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {coupons.map((coupon) => (
        <Card key={coupon.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm">
              <div className="font-medium">{coupon.code}{coupon.active ? "" : " · Off"}</div>
              <div className="text-muted-foreground">
                {coupon.kind === "PERCENT" ? `${coupon.amount}% off` : `₹${coupon.amount} off`}
                {coupon.minRupees ? ` · min ₹${coupon.minRupees}` : ""}
                {coupon.expiresOn ? ` · until ${coupon.expiresOn}` : ""}
                {" · "}
                {coupon.usedCount} used{coupon.usageLimit ? ` of ${coupon.usageLimit}` : ""}
              </div>
            </div>
            {canEdit ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "coupon-update", id: coupon.id, active: !coupon.active })}>
                  {coupon.active ? "Turn off" : "Turn on"}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "coupon-delete", id: coupon.id })}>
                  Delete
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {canEdit ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Banner</p>
            <Input aria-label="Banner title" value={title} placeholder="Offer title" onChange={(event) => setTitle(event.target.value)} className="min-h-11" />
            <Input aria-label="Banner details" value={body} placeholder="Short details (optional)" onChange={(event) => setBody(event.target.value)} className="min-h-11" />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="min-h-11"
              onClick={async () => {
                const saved = await send({ action: "banner", title, body });
                if (saved) {
                  setTitle("");
                  setBody("");
                }
              }}
            >
              Add banner
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {banners.map((banner) => (
        <Card key={banner.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm">
              <div className="font-medium">{banner.title}{banner.active ? "" : " · Hidden"}</div>
              {banner.body ? <div className="text-muted-foreground">{banner.body}</div> : null}
            </div>
            {canEdit ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "banner-update", id: banner.id, active: !banner.active })}>
                  {banner.active ? "Hide" : "Show"}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "banner-delete", id: banner.id })}>
                  Delete
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
