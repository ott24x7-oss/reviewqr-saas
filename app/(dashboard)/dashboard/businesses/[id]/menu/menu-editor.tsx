"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRupees } from "@/lib/tap/order-message";

type Option = {
  id: string;
  label: string;
  labelHi: string;
  size: string;
  colour: string;
  priceRupees: number;
  inStock: boolean;
};

type AddOn = {
  id: string;
  name: string;
  nameHi: string;
  priceRupees: number;
  inStock: boolean;
};

type CopyField = "description" | "nameHi";

type Item = {
  id: string;
  name: string;
  nameHi: string;
  priceRupees: number;
  mrpRupees: number | null;
  description: string;
  bestseller: boolean;
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
  available: boolean;
  variants: Option[];
  addOns: AddOn[];
};

export function MenuEditor({
  businessId,
  businessName,
  aiReady,
  canEdit,
  categories,
  loose
}: {
  businessId: string;
  businessName: string;
  aiReady: boolean;
  canEdit: boolean;
  categories: { id: string; name: string; nameHi: string; items: Item[] }[];
  loose: Item[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [nameHi, setNameHi] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [mrp, setMrp] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [bestseller, setBestseller] = React.useState(false);
  const [veg, setVeg] = React.useState<Item["veg"]>("VEG");
  const [categoryId, setCategoryId] = React.useState("");
  const [categoryName, setCategoryName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [draftItems, setDraftItems] = React.useState<Array<{ name: string; priceRupees: number; veg: Item["veg"] }>>([]);
  const [bulkCategory, setBulkCategory] = React.useState("");
  const [bulkMode, setBulkMode] = React.useState<"percent" | "rupees">("percent");
  const [bulkAmount, setBulkAmount] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const hasItems = categories.some((category) => category.items.length > 0) || loose.length > 0;

  async function send(body: Record<string, unknown>, keepForm = false) {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/menu`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save the menu");
      toast.success("Menu saved");
      if (!keepForm) {
        setName("");
        setNameHi("");
        setPrice("");
        setMrp("");
        setDescription("");
        setBestseller(false);
        setCategoryName("");
      }
      router.refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the menu");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function suggestCopy(
    field: CopyField,
    current: { name: string; nameHi: string },
    apply: (text: string) => void
  ) {
    if (!current.name.trim()) {
      toast.error("Name the item first");
      return;
    }
    if (!aiReady) {
      toast.error("A suggestion isn't available right now. You can type it yourself.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/menu/copy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ field, name: current.name, nameHi: current.nameHi })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || typeof json.text !== "string" || !json.text.trim()) {
        throw new Error(json.error || "A suggestion isn't available right now. You can type it yourself.");
      }
      apply(json.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "A suggestion isn't available right now. You can type it yourself.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display">Menu</h1>
        <p className="text-sm text-muted-foreground">{businessName}</p>
      </div>
      {canEdit && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input aria-label="Item name" value={name} placeholder="Item name" onChange={(event) => setName(event.target.value)} />
            <Input aria-label="Hindi name" value={nameHi} placeholder="Hindi name" onChange={(event) => setNameHi(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input aria-label="Price in rupees" value={price} inputMode="decimal" placeholder="Price in ₹" onChange={(event) => setPrice(event.target.value)} />
              <Input aria-label="Original price (MRP) in rupees" value={mrp} inputMode="decimal" placeholder="MRP ₹ (optional)" onChange={(event) => setMrp(event.target.value)} />
            </div>
            <textarea
              aria-label="Short description"
              value={description}
              maxLength={200}
              rows={2}
              placeholder="Short description (optional), e.g. Crispy dosa with potato masala"
              onChange={(event) => setDescription(event.target.value)}
              className="flex w-full rounded-lg border bg-white px-3 py-2 text-sm"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="h-11 min-h-11" disabled={busy} onClick={() => suggestCopy("description", { name, nameHi }, setDescription)}>
                Write a short description
              </Button>
              <Button type="button" variant="outline" className="h-11 min-h-11" disabled={busy} onClick={() => suggestCopy("nameHi", { name, nameHi }, setNameHi)}>
                Hindi name
              </Button>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={bestseller} onChange={(event) => setBestseller(event.target.checked)} className="h-5 w-5" />
              Mark as bestseller
            </label>
            <select aria-label="Veg mark" value={veg} onChange={(event) => setVeg(event.target.value as Item["veg"])} className="flex h-11 w-full rounded-lg border bg-white px-3 text-sm">
              <option value="VEG">Veg</option>
              <option value="NON_VEG">Non-veg</option>
              <option value="EGG">Egg</option>
              <option value="NONE">No mark</option>
            </select>
            <select aria-label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="flex h-11 w-full rounded-lg border bg-white px-3 text-sm">
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <Button type="button" disabled={busy} onClick={() => send({
                  action: "item",
                  name,
                  nameHi,
                  priceRupees: Number(price || 0),
                  mrpRupees: mrp ? Number(mrp) : null,
                  description,
                  bestseller,
                  veg,
                  categoryId: categoryId || null
                })}>
              Add item
            </Button>
            <Input aria-label="Category name" value={categoryName} placeholder="New category" onChange={(event) => setCategoryName(event.target.value)} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" disabled={busy} onClick={() => send({ action: "category", name: categoryName })}>
                Add category
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => send({ action: "template" })}>
                Café template
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (!aiReady) {
                    toast.message("Menu photo import needs an AI key. Add items by hand.");
                    return;
                  }
                  fileRef.current?.click();
                }}
              >
                Read a menu photo
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Menu photo"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > 4_000_000) {
                  toast.error("Choose a photo under 4 MB");
                  return;
                }
                const reader = new FileReader();
                reader.onload = async () => {
                  setBusy(true);
                  try {
                    const res = await fetch(`/api/businesses/${businessId}/menu/import`, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ image: String(reader.result || "") })
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(json.error || "Could not read that photo. Add items by hand.");
                    setDraftItems(Array.isArray(json.items) ? json.items : []);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not read that photo. Add items by hand.");
                  } finally {
                    setBusy(false);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            {draftItems.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Found {draftItems.length} items. Check them, then add.</p>
                <ul className="space-y-1 text-sm">
                  {draftItems.map((item, index) => (
                    <li key={`${item.name}-${index}`}>{item.name} · ₹{item.priceRupees}</li>
                  ))}
                </ul>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const saved = await send({ action: "items", items: draftItems });
                    if (saved) setDraftItems([]);
                  }}
                >
                  Add these items
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
      {canEdit && hasItems ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Change prices</p>
            <select
              aria-label="Items to reprice"
              value={bulkCategory}
              onChange={(event) => setBulkCategory(event.target.value)}
              className="flex h-11 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">All items</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Price change"
                value={bulkMode}
                onChange={(event) => setBulkMode(event.target.value as "percent" | "rupees")}
                className="flex h-11 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="percent">Percent</option>
                <option value="rupees">Rupees</option>
              </select>
              <Input
                aria-label="Price change amount"
                value={bulkAmount}
                inputMode="decimal"
                placeholder={bulkMode === "percent" ? "10 or -10" : "20 or -20"}
                onChange={(event) => setBulkAmount(event.target.value)}
                className="min-h-11"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="min-h-11"
              onClick={() => {
                const amount = Number(bulkAmount);
                if (!Number.isFinite(amount)) {
                  toast.error("Enter a price change");
                  return;
                }
                void send({ action: "bulk-price", categoryId: bulkCategory || null, mode: bulkMode, amount }, true);
              }}
            >
              Apply to item and option prices
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {[...categories.map((category) => ({ ...category, loose: false })), { id: "loose", name: "No category", nameHi: "", items: loose, loose: true }]
        .filter((group) => !group.loose || group.items.length > 0)
        .map((group) => (
        <section key={group.id} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{group.name}</h2>
            {canEdit && !group.loose && group.items.length === 0 ? (
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "delete", kind: "category", id: group.id })}>
                Delete
              </Button>
            ) : null}
          </div>
          {group.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {item.name}
                      {item.bestseller ? <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">Bestseller</span> : null}
                      {item.available ? null : <span className="ml-2 text-xs font-semibold text-muted-foreground">Hidden</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.nameHi ? `${item.nameHi} · ` : ""}
                      {formatRupees(Math.round(item.priceRupees * 100))}
                      {item.mrpRupees ? <s className="ml-1">{formatRupees(Math.round(item.mrpRupees * 100))}</s> : null} · {item.veg}
                    </div>
                    {item.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p> : null}
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "update", id: item.id, bestseller: !item.bestseller }, true)}>
                        {item.bestseller ? "Unmark bestseller" : "Bestseller"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "update", id: item.id, available: !item.available }, true)}>
                        {item.available ? "Hide" : "Show"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "delete", kind: "item", id: item.id }, true)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
                {canEdit ? (
                  <ItemCopy
                    item={item}
                    busy={busy}
                    onSuggest={suggestCopy}
                    onSave={(nextHi, nextDescription) => send({ action: "update", id: item.id, nameHi: nextHi, description: nextDescription }, true)}
                  />
                ) : null}
                <ItemOptions item={item} canEdit={canEdit} busy={busy} send={send} />
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}

function ItemCopy({
  item,
  busy,
  onSuggest,
  onSave
}: {
  item: Item;
  busy: boolean;
  onSuggest: (field: CopyField, current: { name: string; nameHi: string }, apply: (text: string) => void) => void;
  onSave: (nameHi: string, description: string) => void;
}) {
  const [nameHi, setNameHi] = React.useState(item.nameHi);
  const [description, setDescription] = React.useState(item.description);
  React.useEffect(() => {
    setNameHi(item.nameHi);
    setDescription(item.description);
  }, [item.id, item.nameHi, item.description]);

  return (
    <div className="space-y-2">
      <Input aria-label={`Hindi name for ${item.name}`} value={nameHi} placeholder="Hindi name" onChange={(event) => setNameHi(event.target.value)} className="min-h-11" />
      <textarea
        aria-label={`Short description for ${item.name}`}
        value={description}
        maxLength={200}
        rows={2}
        placeholder="Short description"
        onChange={(event) => setDescription(event.target.value)}
        className="flex min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11"
          disabled={busy}
          onClick={() => onSuggest("description", { name: item.name, nameHi }, setDescription)}
        >
          Write a short description
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11"
          disabled={busy}
          onClick={() => onSuggest("nameHi", { name: item.name, nameHi }, setNameHi)}
        >
          Hindi name
        </Button>
        <Button type="button" className="h-11 min-h-11" disabled={busy} onClick={() => onSave(nameHi, description)}>
          Save
        </Button>
      </div>
    </div>
  );
}

function ItemOptions({
  item,
  canEdit,
  busy,
  send
}: {
  item: Item;
  canEdit: boolean;
  busy: boolean;
  send: (body: Record<string, unknown>, keepForm?: boolean) => Promise<boolean>;
}) {
  const [label, setLabel] = React.useState("");
  const [size, setSize] = React.useState("");
  const [colour, setColour] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [addOnName, setAddOnName] = React.useState("");
  const [addOnPrice, setAddOnPrice] = React.useState("");
  if (!canEdit && item.variants.length === 0 && item.addOns.length === 0) return null;

  return (
    <div className="space-y-3 border-t pt-3">
      {item.variants.map((variant) => (
        <div key={variant.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            {variant.label}
            {variant.size || variant.colour ? ` · ${[variant.size, variant.colour].filter(Boolean).join(" / ")}` : ""}
            {" · "}
            {formatRupees(Math.round(variant.priceRupees * 100))}
            {variant.inStock ? "" : " · Out of stock"}
          </span>
          {canEdit ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "variant-update", id: variant.id, inStock: !variant.inStock }, true)}>
                {variant.inStock ? "Out of stock" : "In stock"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "variant-delete", id: variant.id }, true)}>
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {item.addOns.map((addOn) => (
        <div key={addOn.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            Add-on: {addOn.name} · {formatRupees(Math.round(addOn.priceRupees * 100))}
            {addOn.inStock ? "" : " · Out of stock"}
          </span>
          {canEdit ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "addon-update", id: addOn.id, inStock: !addOn.inStock }, true)}>
                {addOn.inStock ? "Out of stock" : "In stock"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "addon-delete", id: addOn.id }, true)}>
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {canEdit ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input aria-label={`Option name for ${item.name}`} value={label} placeholder="Option, e.g. Half" onChange={(event) => setLabel(event.target.value)} className="min-h-11" />
            <Input aria-label={`Option price for ${item.name}`} value={price} inputMode="decimal" placeholder="Option price ₹" onChange={(event) => setPrice(event.target.value)} className="min-h-11" />
            <Input aria-label={`Size for ${item.name}`} value={size} placeholder="Size (optional)" onChange={(event) => setSize(event.target.value)} className="min-h-11" />
            <Input aria-label={`Colour for ${item.name}`} value={colour} placeholder="Colour (optional)" onChange={(event) => setColour(event.target.value)} className="min-h-11" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="min-h-11"
            onClick={async () => {
              const saved = await send({
                action: "variant",
                id: item.id,
                name: label,
                size,
                colour,
                priceRupees: Number(price || 0)
              }, true);
              if (saved) {
                setLabel("");
                setSize("");
                setColour("");
                setPrice("");
              }
            }}
          >
            Add option
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Input aria-label={`Add-on name for ${item.name}`} value={addOnName} placeholder="Add-on name" onChange={(event) => setAddOnName(event.target.value)} className="min-h-11" />
            <Input aria-label={`Add-on price for ${item.name}`} value={addOnPrice} inputMode="decimal" placeholder="Add-on price ₹" onChange={(event) => setAddOnPrice(event.target.value)} className="min-h-11" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="min-h-11"
            onClick={async () => {
              const saved = await send({
                action: "addon",
                id: item.id,
                name: addOnName,
                priceRupees: Number(addOnPrice || 0)
              }, true);
              if (saved) {
                setAddOnName("");
                setAddOnPrice("");
              }
            }}
          >
            Add add-on
          </Button>
        </>
      ) : null}
    </div>
  );
}
