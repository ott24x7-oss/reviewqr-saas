"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";
import { ShopLangToggle, useShopLang } from "./lang";
import type { ShopProduct } from "./types";

export function ProductBuy({ product }: { product: ShopProduct }) {
  const { lang, choose, copy } = useShopLang();
  const [sku, setSku] = React.useState(product.variants[0]?.sku ?? "");
  const variant = product.variants.find((item) => item.sku === sku) ?? product.variants[0];
  const [qty, setQty] = React.useState(variant?.minQty ?? 1);
  const [pincode, setPincode] = React.useState("");
  const [estimate, setEstimate] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const name = lang === "hi" && product.nameHi ? product.nameHi : product.name;
  const description = lang === "hi" && product.descriptionHi ? product.descriptionHi : product.description;

  async function add() {
    setAdding(true);
    try {
      const response = await fetch("/api/v1/shop/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku, qty })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Could not add this item");
      toast.success(copy.cart);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add this item");
    } finally {
      setAdding(false);
    }
  }

  async function checkDelivery() {
    if (!variant) return;
    const response = await fetch("/api/v1/shop/estimate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pincode, weightGrams: variant.ships ? variant.weightGrams * qty : 0 })
    });
    const payload = (await response.json()) as { data?: { serviceable?: boolean; etdDays?: number | null; ratePaise?: number | null; message?: string }; error?: { message?: string } };
    if (!response.ok) {
      setEstimate(payload.error?.message || copy.notServiceable);
      return;
    }
    const data = payload.data;
    if (!data?.serviceable) {
      setEstimate(data?.message || copy.notServiceable);
      return;
    }
    const days = data.etdDays ? `${data.etdDays}d` : "";
    const rate = data.ratePaise ? formatINR(data.ratePaise) : "";
    setEstimate([data.message, days, rate].filter(Boolean).join(" · "));
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard/shop" className="text-sm text-muted-ink">{copy.shop}</Link>
        <ShopLangToggle lang={lang} choose={choose} />
      </div>
      <article className="space-y-4 rounded-[20px] bg-white p-4 text-ink shadow-sm sm:p-6">
        <h1 className="font-display text-2xl font-bold">{name}</h1>
        <p className="text-sm leading-relaxed">{description}</p>
        {product.variants.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {product.variants.map((item) => (
              <button key={item.sku} type="button" className={`rounded-full px-3 py-1 text-sm ${item.sku === sku ? "bg-ink text-white" : "bg-secondary"}`} onClick={() => setSku(item.sku)}>
                {lang === "hi" && item.nameHi ? item.nameHi : item.name}
              </button>
            ))}
          </div>
        )}
        {variant && (
          <p className="text-xl font-semibold">
            {formatINR(variant.salePaise)}
            {variant.mrpPaise > variant.salePaise && <span className="ml-2 text-sm font-normal text-muted-ink line-through">{formatINR(variant.mrpPaise)}</span>}
          </p>
        )}
        <p className="text-sm text-muted-ink">{copy.priceNote}</p>
        <p className="text-sm">{product.needsDesign ? copy.policy : copy.digital}</p>
        <div className="space-y-2">
          <Label htmlFor="qty">{copy.qty}</Label>
          <Input id="qty" inputMode="numeric" value={qty} onChange={(event) => setQty(Math.max(1, Math.floor(Number(event.target.value) || 1)))} />
        </div>
        {variant?.ships && (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="pincode">{copy.pincode}</Label>
              <Input id="pincode" inputMode="numeric" value={pincode} onChange={(event) => setPincode(event.target.value)} />
            </div>
            <Button type="button" variant="outline" className="mt-7 rounded-full" onClick={checkDelivery}>{copy.check}</Button>
          </div>
        )}
        {estimate && <p className="text-sm">{copy.estimate}: {estimate}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="rounded-full bg-ink text-white hover:bg-ink/90" onClick={add} disabled={adding || !variant}>{copy.add}</Button>
          <Button type="button" variant="outline" className="rounded-full" asChild>
            <Link href="/dashboard/shop/cart">{copy.cart}</Link>
          </Button>
        </div>
      </article>
    </div>
  );
}
