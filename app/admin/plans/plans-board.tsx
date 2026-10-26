"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceCard } from "@/components/plans/price-card";
import { DURATIONS, DURATION_LABELS, MODULES, savingsPercent, type ModuleId } from "@/lib/plans/catalog";
import { PLAN_CATEGORIES } from "@/lib/plans/categories";
import { ImageUpload } from "@/components/ui/image-upload";

type Price = { duration: string; pricePaise: number; mrpPaise: number | null; active: boolean };
type Bullet = { en: string; hi: string; compare: boolean };
export type AdminPlan = {
  id: string;
  nameEn: string;
  nameHi: string;
  slug: string;
  descriptionEn: string;
  descriptionHi: string;
  modules: string[];
  limits: { businesses: number; qrCodes: number; products: number; staff: number; locations: number; aiCalls: number };
  bullets: Bullet[];
  badge: string | null;
  category: string;
  imageUrl: string;
  active: boolean;
  visibleOnPricingPage: boolean;
  legacyTier: string;
  prices: Price[];
};

const TIERS = ["FREE", "STARTER", "GROWTH", "AGENCY", "FOUNDER"] as const;
const emptyLimits = { businesses: 1, qrCodes: 2, products: 100000, staff: 1, locations: 1, aiCalls: 30 };
const LIMIT_FIELDS = [
  { key: "businesses", label: "Businesses" },
  { key: "qrCodes", label: "QR codes" },
  { key: "products", label: "Menu items" },
  { key: "staff", label: "Staff" },
  { key: "locations", label: "Locations" },
  { key: "aiCalls", label: "AI replies" }
] as const;

function blank(): AdminPlan {
  return {
    id: "",
    nameEn: "",
    nameHi: "",
    slug: "",
    descriptionEn: "",
    descriptionHi: "",
    modules: ["REVIEWS"],
    limits: { ...emptyLimits },
    bullets: [],
    badge: "",
    category: "reviews",
    imageUrl: "",
    active: true,
    visibleOnPricingPage: true,
    legacyTier: "STARTER",
    prices: DURATIONS.map((duration) => ({ duration, pricePaise: 0, mrpPaise: null, active: duration !== "LIFETIME" }))
  };
}

function rupees(paise: number) {
  return paise ? String(paise / 100) : "";
}

function toPaise(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function PlansBoard({ plans }: { plans: AdminPlan[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState(plans);
  const [editing, setEditing] = React.useState<AdminPlan | null>(null);
  const [busy, setBusy] = React.useState(false);
  const dragId = React.useRef<string | null>(null);

  React.useEffect(() => setRows(plans), [plans]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    const body = {
      ...editing,
      badge: editing.badge || null,
      prices: editing.prices.map((price) => ({
        ...price,
        mrpPaise: price.mrpPaise || null
      }))
    };
    const res = await fetch(editing.id ? `/api/admin/plans/${editing.id}` : "/api/admin/plans", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || "Could not save the plan");
      return;
    }
    toast.success("Plan saved");
    setEditing(null);
    router.refresh();
  }

  async function act(id: string, action: "archive" | "duplicate") {
    const res = await fetch(`/api/admin/plans/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not update the plan");
      return;
    }
    toast.success(action === "archive" ? "Plan archived" : "Plan duplicated");
    router.refresh();
  }

  async function dropOn(targetId: string) {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === targetId) return;
    const next = [...rows];
    const fromIndex = next.findIndex((row) => row.id === from);
    const toIndex = next.findIndex((row) => row.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    setRows(next);
    const res = await fetch("/api/admin/plans/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: next.map((row) => row.id) })
    });
    if (!res.ok) toast.error("Could not save the order");
    else router.refresh();
  }

  const preview = editing;
  const previewPrice = preview?.prices.find((price) => price.active && price.pricePaise > 0) || preview?.prices[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setEditing(blank())}>
          New plan
        </Button>
      </div>
      <ul className="space-y-2">
        {rows.map((plan) => (
          <li
            key={plan.id}
            draggable
            onDragStart={() => {
              dragId.current = plan.id;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => void dropOn(plan.id)}
            className="flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900"
          >
            <div>
              <p className="font-medium">
                {plan.nameEn}{" "}
                <span className="text-sm text-muted-foreground">/ {plan.slug}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {plan.modules.join(" + ")}
                {!plan.active ? " · archived" : ""}
                {!plan.visibleOnPricingPage ? " · hidden" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(plan)}>
                Edit
              </Button>
              <Button type="button" variant="outline" onClick={() => void act(plan.id, "duplicate")}>
                Duplicate
              </Button>
              {plan.active ? (
                <Button type="button" variant="outline" onClick={() => void act(plan.id, "archive")}>
                  Archive
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4 rounded-xl border p-4">
            <h2 className="font-display text-xl font-bold">{editing.id ? "Edit plan" : "New plan"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="nameEn">Name (English)</Label>
                <Input id="nameEn" value={editing.nameEn} onChange={(event) => setEditing({ ...editing, nameEn: event.target.value })} required />
              </div>
              <div>
                <Label htmlFor="nameHi">Name (Hindi)</Label>
                <Input id="nameHi" value={editing.nameHi} onChange={(event) => setEditing({ ...editing, nameHi: event.target.value })} required />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={editing.slug} onChange={(event) => setEditing({ ...editing, slug: event.target.value })} placeholder="review-menu" />
              </div>
              <div>
                <Label htmlFor="badge">Badge</Label>
                <Input id="badge" value={editing.badge || ""} onChange={(event) => setEditing({ ...editing, badge: event.target.value })} placeholder="Best seller" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
                  value={editing.category}
                  onChange={(event) => setEditing({ ...editing, category: event.target.value })}
                >
                  {PLAN_CATEGORIES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ImageUpload
              label="Product image"
              hint="Shown on the landing cards. Leave empty to use the category default."
              variant="cover"
              value={editing.imageUrl || null}
              onChange={(value) => setEditing({ ...editing, imageUrl: value || "" })}
            />
            <div>
              <Label htmlFor="descriptionEn">Description (English)</Label>
              <Input id="descriptionEn" value={editing.descriptionEn} onChange={(event) => setEditing({ ...editing, descriptionEn: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="descriptionHi">Description (Hindi)</Label>
              <Input id="descriptionHi" value={editing.descriptionHi} onChange={(event) => setEditing({ ...editing, descriptionHi: event.target.value })} />
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Modules</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {MODULES.map((mod) => (
                  <label key={mod.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.modules.includes(mod.id)}
                      onChange={(event) => {
                        const modules = event.target.checked
                          ? [...editing.modules, mod.id]
                          : editing.modules.filter((id) => id !== mod.id);
                        setEditing({ ...editing, modules });
                      }}
                    />
                    {mod.nameEn}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Feature bullets</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing({ ...editing, bullets: [...editing.bullets, { en: "", hi: "", compare: true }] })}
                >
                  Add bullet
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave this empty and the pricing page lists the plan&apos;s modules. Tick a line to show it in the comparison table.
              </p>
              {editing.bullets.map((bullet, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    aria-label={`Bullet ${index + 1} English`}
                    placeholder="English"
                    value={bullet.en}
                    required
                    onChange={(event) => {
                      const bullets = [...editing.bullets];
                      bullets[index] = { ...bullet, en: event.target.value };
                      setEditing({ ...editing, bullets });
                    }}
                  />
                  <Input
                    aria-label={`Bullet ${index + 1} Hindi`}
                    placeholder="हिन्दी"
                    value={bullet.hi}
                    required
                    onChange={(event) => {
                      const bullets = [...editing.bullets];
                      bullets[index] = { ...bullet, hi: event.target.value };
                      setEditing({ ...editing, bullets });
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={bullet.compare}
                        aria-label={`Bullet ${index + 1} show in comparison table`}
                        onChange={(event) => {
                          const bullets = [...editing.bullets];
                          bullets[index] = { ...bullet, compare: event.target.checked };
                          setEditing({ ...editing, bullets });
                        }}
                      />
                      Show in comparison table
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing({ ...editing, bullets: editing.bullets.filter((_, item) => item !== index) })}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {LIMIT_FIELDS.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type="number"
                    min={0}
                    value={editing.limits[field.key]}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        limits: { ...editing.limits, [field.key]: Math.max(0, Math.floor(Number(event.target.value) || 0)) }
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="legacyTier">Compatibility tier</Label>
                <select
                  id="legacyTier"
                  className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
                  value={editing.legacyTier}
                  onChange={(event) => setEditing({ ...editing, legacyTier: event.target.value })}
                >
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.visibleOnPricingPage}
                  onChange={(event) => setEditing({ ...editing, visibleOnPricingPage: event.target.checked })}
                />
                Show on pricing page
              </label>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Prices</p>
              {editing.prices.map((price, index) => (
                <div key={price.duration} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={price.active}
                      onChange={(event) => {
                        const prices = [...editing.prices];
                        prices[index] = { ...price, active: event.target.checked };
                        setEditing({ ...editing, prices });
                      }}
                    />
                    {DURATION_LABELS[price.duration as keyof typeof DURATION_LABELS]?.en || price.duration}
                  </label>
                  <Input
                    aria-label={`${price.duration} price`}
                    placeholder="Price ₹"
                    value={rupees(price.pricePaise)}
                    onChange={(event) => {
                      const prices = [...editing.prices];
                      prices[index] = { ...price, pricePaise: toPaise(event.target.value) };
                      setEditing({ ...editing, prices });
                    }}
                  />
                  <Input
                    aria-label={`${price.duration} mrp`}
                    placeholder="MRP ₹"
                    value={price.mrpPaise ? rupees(price.mrpPaise) : ""}
                    onChange={(event) => {
                      const prices = [...editing.prices];
                      prices[index] = { ...price, mrpPaise: event.target.value ? toPaise(event.target.value) : null };
                      setEditing({ ...editing, prices });
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save plan"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
          {preview && previewPrice ? (
            <PriceCard
              name={preview.nameEn || "Plan name"}
              description={preview.descriptionEn}
              badge={preview.badge}
              pricePaise={previewPrice.pricePaise}
              mrpPaise={previewPrice.mrpPaise}
              periodLabel={DURATION_LABELS[previewPrice.duration as keyof typeof DURATION_LABELS]?.en || ""}
              savings={savingsPercent({ pricePaise: previewPrice.pricePaise, mrpPaise: previewPrice.mrpPaise })}
              modules={
                preview.bullets.length
                  ? preview.bullets.map((bullet) => bullet.en)
                  : preview.modules.length
                    ? preview.modules
                    : (["REVIEWS"] as ModuleId[])
              }
              cta="Preview"
            />
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
