"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VariantRow = {
  id: string;
  sku: string;
  name: string;
  salePaise: number;
  mrpPaise: number;
  costPaise: number;
  hsn: string;
  gstPercent: number;
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  stock: number;
  lowStockAt: number;
  minQty: number;
  active: boolean;
  low: boolean;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  nameHi: string | null;
  description: string;
  descriptionHi: string | null;
  needsNfc: boolean;
  needsDesign: boolean;
  defaultTemplateId: string | null;
  active: boolean;
  variants: VariantRow[];
};

function rupees(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function CatalogBoard({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function saveVariant(id: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/shop/variants/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save");
      toast.success("Variant saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <Card key={product.id}>
          <CardHeader>
            <CardTitle className="text-lg">
              {product.name}
              {product.nameHi ? <span className="ml-2 text-sm font-normal text-muted-foreground">{product.nameHi}</span> : null}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.variants.map((variant) => (
              <VariantEditor key={variant.id} variant={variant} busy={busy} onSave={saveVariant} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VariantEditor({
  variant,
  busy,
  onSave
}: {
  variant: VariantRow;
  busy: boolean;
  onSave: (id: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [stock, setStock] = React.useState(String(variant.stock));
  const [lowStockAt, setLowStockAt] = React.useState(String(variant.lowStockAt));
  const [sale, setSale] = React.useState(String(variant.salePaise / 100));
  const [mrp, setMrp] = React.useState(String(variant.mrpPaise / 100));
  const [minQty, setMinQty] = React.useState(String(variant.minQty));

  return (
    <form
      className="grid gap-3 rounded-2xl border border-border p-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const salePaise = Math.round(Number(sale) * 100);
        const mrpPaise = Math.round(Number(mrp) * 100);
        void onSave(variant.id, {
          stock: Number(stock),
          lowStockAt: Number(lowStockAt),
          salePaise,
          mrpPaise,
          minQty: Number(minQty),
          active: variant.active
        });
      }}
    >
      <div className="sm:col-span-2">
        <p className="font-medium">
          {variant.sku} · {variant.name}
          {variant.low ? <span className="ml-2 text-sm text-amber-700">Low stock</span> : null}
          {!variant.active ? <span className="ml-2 text-sm text-muted-foreground">Hidden</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          Cost {rupees(variant.costPaise)} · HSN {variant.hsn} · GST {variant.gstPercent}% · {variant.weightGrams} g ·{" "}
          {variant.lengthMm}×{variant.widthMm}×{variant.heightMm} mm
        </p>
      </div>
      <Field id={`${variant.sku}-sale`} label="Sale price (₹)" value={sale} onChange={setSale} />
      <Field id={`${variant.sku}-mrp`} label="MRP (₹)" value={mrp} onChange={setMrp} />
      <Field id={`${variant.sku}-stock`} label="Stock" value={stock} onChange={setStock} />
      <Field id={`${variant.sku}-low`} label="Low-stock alert" value={lowStockAt} onChange={setLowStockAt} />
      <Field id={`${variant.sku}-min`} label="Minimum quantity" value={minQty} onChange={setMinQty} />
      <div className="flex items-end">
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          Save
        </Button>
      </div>
    </form>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
