"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";
import { ShopLangToggle, useShopLang } from "./lang";

type Design = {
  templateId: string;
  businessId: string;
  qrShortCode?: string | null;
  deviceId?: string | null;
  headline?: string | null;
};

type CartLine = {
  sku: string;
  name: string;
  nameHi: string | null;
  qty: number;
  unitPaise: number;
  needsDesign: boolean;
  needsNfc: boolean;
  design: Design | null;
  designError: string | null;
};

type CartView = {
  businessId: string | null;
  couponCode: string | null;
  referralCode: string | null;
  buyerGstin: string | null;
  buyerLegalName: string | null;
  addressId: string | null;
  lines: CartLine[];
  quote: {
    ok: boolean;
    error?: string;
    totalPaise?: number;
    taxablePaise?: number;
    cgstPaise?: number;
    sgstPaise?: number;
    igstPaise?: number;
    couponRejected?: boolean;
    referralRejected?: boolean;
  };
  addresses: Array<{ id: string; name: string; line1: string; city: string; state: string; pincode: string }>;
  businesses: Array<{ id: string; name: string }>;
  qrCodes: Array<{ shortCode: string; label: string | null }>;
  devices: Array<{ id: string; kind: string; chipUid: string | null }>;
  templates: Array<{ id: string; name: string }>;
};

const blankAddress = { name: "", phone: "", line1: "", city: "", state: "", pincode: "" };

export function CartEditor() {
  const { lang, choose, copy } = useShopLang();
  const [cart, setCart] = React.useState<CartView | null>(null);
  const [address, setAddress] = React.useState(blankAddress);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const response = await fetch("/api/v1/shop/cart");
    const payload = (await response.json()) as { data?: CartView; error?: { message?: string } };
    if (!response.ok || !payload.data) {
      toast.error(payload.error?.message || "Could not load the cart");
      return;
    }
    setCart(payload.data);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function patch(partial: Partial<CartView>) {
    setCart((current) => (current ? { ...current, ...partial } : current));
  }

  async function save() {
    if (!cart) return;
    setSaving(true);
    try {
      const response = await fetch("/api/v1/shop/cart", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId: cart.businessId,
          couponCode: cart.couponCode,
          referralCode: cart.referralCode,
          buyerGstin: cart.buyerGstin,
          buyerLegalName: cart.buyerLegalName,
          addressId: cart.addressId,
          lines: cart.lines.filter((line) => line.sku).map((line) => ({ sku: line.sku, qty: line.qty, design: line.design }))
        })
      });
      const payload = (await response.json()) as { data?: CartView; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Could not save the cart");
      setCart(payload.data);
      toast.success(copy.save);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the cart");
    } finally {
      setSaving(false);
    }
  }

  async function addAddress() {
    const response = await fetch("/api/v1/shop/addresses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...address, isDefault: true })
    });
    const payload = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      toast.error(payload.error?.message || "Could not save the address");
      return;
    }
    setAddress(blankAddress);
    await load();
  }

  if (!cart) return <p className="text-sm text-muted-ink">{copy.cart}</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard/shop" className="text-sm text-muted-ink">{copy.shop}</Link>
        <ShopLangToggle lang={lang} choose={choose} />
      </div>
      <h1 className="font-display text-2xl font-bold text-ink">{copy.cart}</h1>
      {cart.lines.length === 0 && <p className="rounded-[20px] bg-white p-4 text-sm">{copy.empty}</p>}
      {cart.lines.map((line, index) => (
        <article key={`${line.sku}-${index}`} className="space-y-3 rounded-[20px] bg-white p-4 text-ink shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold">{lang === "hi" && line.nameHi ? line.nameHi : line.name}</h2>
            <p>{formatINR(line.unitPaise * line.qty)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${line.sku}-qty`}>{copy.qty}</Label>
            <Input
              id={`${line.sku}-qty`}
              inputMode="numeric"
              value={line.qty}
              onChange={(event) => {
                const lines = cart.lines.slice();
                lines[index] = { ...line, qty: Math.max(1, Math.floor(Number(event.target.value) || 1)) };
                patch({ lines });
              }}
            />
          </div>
          {(line.needsDesign || line.needsNfc) && (
            <div className="grid gap-3">
              <p className="text-sm">{copy.policy}</p>
              {line.designError && <p className="text-sm text-amber-800">{line.designError}</p>}
              <div className="space-y-2">
                <Label htmlFor={`${line.sku}-template`}>{copy.template}</Label>
                <select
                  id={`${line.sku}-template`}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                  value={line.design?.templateId ?? ""}
                  onChange={(event) => {
                    const lines = cart.lines.slice();
                    lines[index] = {
                      ...line,
                      design: {
                        templateId: event.target.value,
                        businessId: cart.businessId || line.design?.businessId || "",
                        qrShortCode: line.design?.qrShortCode,
                        deviceId: line.design?.deviceId,
                        headline: line.design?.headline
                      }
                    };
                    patch({ lines });
                  }}
                >
                  <option value="">{copy.template}</option>
                  {cart.templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${line.sku}-qr`}>{copy.qr}</Label>
                <select
                  id={`${line.sku}-qr`}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                  value={line.design?.qrShortCode ?? ""}
                  onChange={(event) => {
                    const lines = cart.lines.slice();
                    lines[index] = {
                      ...line,
                      design: {
                        templateId: line.design?.templateId || "",
                        businessId: cart.businessId || "",
                        qrShortCode: event.target.value,
                        deviceId: line.design?.deviceId
                      }
                    };
                    patch({ lines });
                  }}
                >
                  <option value="">{copy.qr}</option>
                  {cart.qrCodes.map((code) => (
                    <option key={code.shortCode} value={code.shortCode}>{code.label || code.shortCode}</option>
                  ))}
                </select>
              </div>
              {line.needsNfc && (
                <div className="space-y-2">
                  <Label htmlFor={`${line.sku}-nfc`}>{copy.nfc}</Label>
                  <select
                    id={`${line.sku}-nfc`}
                    className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                    value={line.design?.deviceId ?? ""}
                    onChange={(event) => {
                      const lines = cart.lines.slice();
                      lines[index] = {
                        ...line,
                        design: {
                          templateId: line.design?.templateId || "",
                          businessId: cart.businessId || "",
                          qrShortCode: line.design?.qrShortCode,
                          deviceId: event.target.value
                        }
                      };
                      patch({ lines });
                    }}
                  >
                    <option value="">{copy.nfc}</option>
                    {cart.devices.map((device) => (
                      <option key={device.id} value={device.id}>{device.kind} {device.chipUid || device.id}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </article>
      ))}

      <section className="space-y-3 rounded-[20px] bg-white p-4 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="cart-business">{copy.business}</Label>
          <select id="cart-business" className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm" value={cart.businessId ?? ""} onChange={(event) => patch({ businessId: event.target.value || null })}>
            <option value="">{copy.business}</option>
            {cart.businesses.map((business) => (
              <option key={business.id} value={business.id}>{business.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="coupon">{copy.coupon}</Label>
            <Input id="coupon" value={cart.couponCode ?? ""} onChange={(event) => patch({ couponCode: event.target.value })} />
            {cart.quote.couponRejected && <p className="text-sm text-amber-800">{copy.coupon}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="referral">{copy.referral}</Label>
            <Input id="referral" value={cart.referralCode ?? ""} onChange={(event) => patch({ referralCode: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstin">{copy.gstin}</Label>
            <Input id="gstin" value={cart.buyerGstin ?? ""} onChange={(event) => patch({ buyerGstin: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legal-name">{copy.businessName}</Label>
            <Input id="legal-name" value={cart.buyerLegalName ?? ""} onChange={(event) => patch({ buyerLegalName: event.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">{copy.address}</Label>
          <select id="address" className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm" value={cart.addressId ?? ""} onChange={(event) => patch({ addressId: event.target.value || null })}>
            <option value="">{copy.address}</option>
            {cart.addresses.map((row) => (
              <option key={row.id} value={row.id}>{row.name}, {row.city} {row.pincode}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["name", "Name"],
              ["phone", "Phone"],
              ["line1", "Address"],
              ["city", "City"],
              ["state", "State"],
              ["pincode", copy.pincode]
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`new-${key}`}>{label}</Label>
              <Input id={`new-${key}`} value={address[key]} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} />
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" className="rounded-full" onClick={addAddress}>{copy.address}</Button>
        {cart.quote.ok ? (
          <div className="text-sm">
            <p className="text-lg font-semibold">{copy.total} {formatINR(cart.quote.totalPaise || 0)}</p>
            <p>CGST {formatINR(cart.quote.cgstPaise || 0)} · SGST {formatINR(cart.quote.sgstPaise || 0)} · IGST {formatINR(cart.quote.igstPaise || 0)}</p>
          </div>
        ) : (
          <p className="text-sm text-amber-800">{cart.quote.error}</p>
        )}
        <Button type="button" className="rounded-full bg-ink text-white hover:bg-ink/90" onClick={save} disabled={saving}>{copy.save}</Button>
      </section>
    </div>
  );
}
