"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRupees } from "@/lib/tap/order-message";

type Item = {
  id: string;
  name: string;
  nameHi: string;
  priceRupees: number;
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
  available: boolean;
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
  const [veg, setVeg] = React.useState<Item["veg"]>("VEG");
  const [categoryId, setCategoryId] = React.useState("");
  const [categoryName, setCategoryName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [draftItems, setDraftItems] = React.useState<Array<{ name: string; priceRupees: number; veg: Item["veg"] }>>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function send(body: Record<string, unknown>) {
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
      setName("");
      setNameHi("");
      setPrice("");
      setCategoryName("");
      router.refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the menu");
      return false;
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
            <Input aria-label="Price in rupees" value={price} inputMode="decimal" placeholder="Price in ₹" onChange={(event) => setPrice(event.target.value)} />
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
            <Button type="button" disabled={busy} onClick={() => send({ action: "item", name, nameHi, priceRupees: Number(price || 0), veg, categoryId: categoryId || null })}>
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
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">{item.nameHi} · {formatRupees(Math.round(item.priceRupees * 100))} · {item.veg}</div>
                </div>
                {canEdit && (
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "update", id: item.id, available: !item.available })}>
                      {item.available ? "Hide" : "Show"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "delete", kind: "item", id: item.id })}>
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
