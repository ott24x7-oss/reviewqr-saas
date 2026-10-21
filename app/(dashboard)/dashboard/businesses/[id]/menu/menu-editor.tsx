"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRupees } from "@/lib/tap/order-message";
import type { StoreView } from "@/lib/store/layout";
import type { EntryRow } from "@/lib/store/entry";
import { MenuEntry, rowFromDraft, type MenuSave } from "./menu-entry";

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

function minutesOf(value: string) {
  if (!value.trim()) return null;
  const minutes = Math.round(Number(value));
  if (!Number.isFinite(minutes) || minutes < 1) return null;
  return Math.min(480, minutes);
}

type Item = {
  id: string;
  name: string;
  nameHi: string;
  priceRupees: number;
  mrpRupees: number | null;
  description: string;
  bestseller: boolean;
  photo: string | null;
  photos: string[];
  brand: string;
  durationMinutes: number | null;
  barcode: string;
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
  available: boolean;
  variants: Option[];
  addOns: AddOn[];
};

export function MenuEditor({
  businessId,
  businessName,
  layout,
  aiReady,
  canEdit,
  categories,
  loose
}: {
  businessId: string;
  businessName: string;
  layout: StoreView;
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
  const [inStock, setInStock] = React.useState(true);
  const [brand, setBrand] = React.useState("");
  const [photo, setPhoto] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [duration, setDuration] = React.useState("");
  const [colour, setColour] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [categoryName, setCategoryName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [quickName, setQuickName] = React.useState("");
  const [quickPrice, setQuickPrice] = React.useState("");
  const [paste, setPaste] = React.useState("");
  const [entryRows, setEntryRows] = React.useState<EntryRow[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [focusVariantId, setFocusVariantId] = React.useState("");
  const [canScan, setCanScan] = React.useState(false);
  const [bulkCategory, setBulkCategory] = React.useState("");
  const [bulkMode, setBulkMode] = React.useState<"percent" | "rupees">("percent");
  const [bulkAmount, setBulkAmount] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const snapRef = React.useRef<HTMLInputElement>(null);
  const draftKey = `rq-menu-draft:${businessId}`;
  const hasItems = categories.some((category) => category.items.length > 0) || loose.length > 0;
  const knownItems = React.useMemo(
    () => [...categories.flatMap((category) => category.items), ...loose],
    [categories, loose]
  );

  React.useEffect(() => {
    setCanScan(typeof window !== "undefined" && "BarcodeDetector" in window);
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<{
          quickName: string;
          quickPrice: string;
          paste: string;
          rows: EntryRow[];
          name: string;
          price: string;
          nameHi: string;
          description: string;
          brand: string;
          colour: string;
          photo: string;
          barcode: string;
          veg: Item["veg"];
          categoryName: string;
          duration: string;
        }>;
        if (typeof saved.quickName === "string") setQuickName(saved.quickName);
        if (typeof saved.quickPrice === "string") setQuickPrice(saved.quickPrice);
        if (typeof saved.paste === "string") setPaste(saved.paste);
        if (Array.isArray(saved.rows)) setEntryRows(saved.rows);
        if (typeof saved.name === "string") setName(saved.name);
        if (typeof saved.price === "string") setPrice(saved.price);
        if (typeof saved.nameHi === "string") setNameHi(saved.nameHi);
        if (typeof saved.description === "string") setDescription(saved.description);
        if (typeof saved.brand === "string") setBrand(saved.brand);
        if (typeof saved.colour === "string") setColour(saved.colour);
        if (typeof saved.photo === "string") setPhoto(saved.photo);
        if (typeof saved.barcode === "string") setBarcode(saved.barcode);
        if (saved.veg === "VEG" || saved.veg === "NON_VEG" || saved.veg === "EGG" || saved.veg === "NONE") setVeg(saved.veg);
        if (typeof saved.categoryName === "string") setCategoryName(saved.categoryName);
        if (typeof saved.duration === "string") setDuration(saved.duration);
      }
    } catch {
      /* A bad draft should not block typing. */
    }
    setHydrated(true);
  }, [draftKey]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        quickName, quickPrice, paste, rows: entryRows,
        name, price, nameHi, description, brand, colour, photo, barcode, veg, categoryName, duration
      }));
    } catch {
      /* The browser can refuse a very large photo URL. The form still works. */
    }
  }, [hydrated, draftKey, quickName, quickPrice, paste, entryRows, name, price, nameHi, description, brand, colour, photo, barcode, veg, categoryName, duration]);

  function openExisting(code: string, selfId?: string) {
    const trimmed = code.trim();
    if (!trimmed) return false;
    const found = knownItems.find((item) => item.barcode && item.barcode === trimmed && item.id !== selfId);
    if (!found) return false;
    document.getElementById(`item-${found.id}`)?.scrollIntoView({ block: "center" });
    toast.message(`Opened ${found.name}`);
    return true;
  }

  async function scanBarcode() {
    const Detector = (window as Window & {
      BarcodeDetector?: new (opts?: { formats?: string[] }) => {
        detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;
    if (!Detector) return "";
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"] });
      const started = Date.now();
      let value = "";
      while (!value && Date.now() - started < 4000) {
        const found = await detector.detect(video);
        value = found[0]?.rawValue?.trim() || "";
        if (!value) await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!value) toast.message("No barcode in view. Type the code.");
      return value;
    } catch {
      toast.message("Type the barcode. The camera is not available.");
      return "";
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  async function send(body: Record<string, unknown>, keepForm = false): Promise<MenuSave> {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/menu`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save the menu");
      toast.success(typeof json.message === "string" && json.message ? json.message : "Menu saved");
      if (!keepForm) {
        setName("");
        setNameHi("");
        setPrice("");
        setMrp("");
        setDescription("");
        setBestseller(false);
        setBrand("");
        setPhoto("");
        setPhotos([]);
        setDuration("");
        setColour("");
        setBarcode("");
        setCategoryName("");
      }
      router.refresh();
      return json as MenuSave;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the menu");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function quickAdd() {
    const itemName = quickName.trim();
    if (!itemName) {
      toast.error("Name the item");
      return;
    }
    if (!/^\d+(?:\.\d+)?$/.test(quickPrice.trim())) {
      toast.error("Enter a price");
      return;
    }
    const saved = await send({
      action: "item",
      name: itemName,
      priceRupees: Number(quickPrice),
      veg: layout === "FOOD" ? veg : "NONE",
      available: true,
      categoryId: categoryId || null
    }, true);
    if (saved) {
      setQuickName("");
      setQuickPrice("");
    }
  }

  function onQuickKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void quickAdd();
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

  async function uploadPhoto(file: File) {
    if (file.size > 8_000_000) {
      toast.error("Choose a photo under 8 MB");
      return "";
    }
    const body = new FormData();
    body.set("file", file);
    body.set("variant", "cover");
    const res = await fetch("/api/uploads", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || typeof json.url !== "string") {
      toast.error(json.error || "Could not upload the photo");
      return "";
    }
    return json.url as string;
  }

  async function onSnap(file: File) {
    if (file.size > 4_000_000) {
      toast.error("Choose a photo under 4 MB");
      return;
    }
    const url = await uploadPhoto(file);
    if (url) setPhoto(url);
    if (!aiReady) {
      toast.message("Type the name and price. A suggestion isn't available right now.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
    if (!dataUrl) {
      toast.error("Could not read that photo. Type the name and price.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/menu/snap`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.item || typeof json.item.name !== "string" || !json.item.name.trim()) {
        throw new Error(json.error || "Could not read that photo. Type the name and price.");
      }
      const item = json.item as { name: string; category?: string; description?: string; veg?: Item["veg"]; brand?: string; colour?: string; durationMinutes?: number | null };
      setName(item.name);
      if (item.description) setDescription(item.description);
      if (layout === "FOOD" && (item.veg === "VEG" || item.veg === "NON_VEG" || item.veg === "EGG" || item.veg === "NONE")) setVeg(item.veg);
      if (layout === "SHOP") {
        if (item.brand) setBrand(item.brand);
        if (item.colour) setColour(item.colour);
      }
      if (layout === "SERVICES" && item.durationMinutes) setDuration(String(item.durationMinutes));
      const category = String(item.category || "").trim();
      const match = categories.find((entry) => entry.name.toLowerCase() === category.toLowerCase());
      if (match) setCategoryId(match.id);
      else if (category) setCategoryName(category);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that photo. Type the name and price.");
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
      {canEdit ? (
        <div className="sticky top-0 z-20 grid grid-cols-[1fr_7rem] gap-2 bg-background py-2">
          <Input aria-label="Quick add name" value={quickName} placeholder="Quick add name" className="h-11 min-h-11" onChange={(event) => setQuickName(event.target.value)} onKeyDown={onQuickKey} />
          <Input aria-label="Quick add price" value={quickPrice} inputMode="decimal" placeholder="₹" className="h-11 min-h-11" onChange={(event) => setQuickPrice(event.target.value)} onKeyDown={onQuickKey} />
        </div>
      ) : null}
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
              <input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} className="h-5 w-5" />
              In stock
            </label>
            {layout === "FOOD" ? (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={bestseller} onChange={(event) => setBestseller(event.target.checked)} className="h-5 w-5" />
                Mark as bestseller
              </label>
            ) : null}
            {layout === "FOOD" ? (
              <select aria-label="Veg mark" value={veg} onChange={(event) => setVeg(event.target.value as Item["veg"])} className="flex h-11 w-full rounded-lg border bg-white px-3 text-sm">
                <option value="VEG">Veg</option>
                <option value="NON_VEG">Non-veg</option>
                <option value="EGG">Egg</option>
                <option value="NONE">No mark</option>
              </select>
            ) : null}
            {layout === "SHOP" ? (
              <>
                <Input aria-label="Brand" value={brand} placeholder="Brand (optional)" onChange={(event) => setBrand(event.target.value)} className="min-h-11" />
                <PhotoFields
                  photo={photo}
                  photos={photos}
                  busy={busy}
                  onCover={(url) => setPhoto(url)}
                  onPhotos={setPhotos}
                  upload={uploadPhoto}
                />
                <Input aria-label="Colour" value={colour} placeholder="Colour (optional)" onChange={(event) => setColour(event.target.value)} className="min-h-11" />
                <div className="flex gap-2">
                  <Input
                    aria-label="Barcode"
                    value={barcode}
                    placeholder="Barcode"
                    onChange={(event) => setBarcode(event.target.value)}
                    onBlur={() => {
                      if (openExisting(barcode)) setBarcode("");
                    }}
                    className="h-11 min-h-11"
                  />
                  {canScan ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 min-h-11"
                      disabled={busy}
                      onClick={async () => {
                        const code = await scanBarcode();
                        if (!code) return;
                        if (openExisting(code)) setBarcode("");
                        else setBarcode(code);
                      }}
                    >
                      Scan barcode
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
            {layout === "SERVICES" ? (
              <Input aria-label="Duration in minutes" inputMode="numeric" value={duration} placeholder="Duration in minutes" onChange={(event) => setDuration(event.target.value)} className="min-h-11" />
            ) : null}
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
                  bestseller: layout === "FOOD" && bestseller,
                  veg: layout === "FOOD" ? veg : "NONE",
                  available: inStock,
                  categoryId: categoryId || null,
                  ...(layout === "SHOP" ? { brand, photo, photos, barcode, colour } : {}),
                  ...(layout === "SERVICES" ? { durationMinutes: minutesOf(duration) } : {}),
                  ...(!categoryId && categoryName.trim() ? { category: categoryName.trim() } : {})
                })}>
              Add item
            </Button>
            <Input aria-label="Category name" value={categoryName} placeholder="New category" onChange={(event) => setCategoryName(event.target.value)} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="h-11 min-h-11" disabled={busy} onClick={() => send({ action: "category", name: categoryName })}>
                Add category
              </Button>
              <Button type="button" variant="outline" className="h-11 min-h-11" disabled={busy} onClick={() => snapRef.current?.click()}>
                Snap a product
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
                    const found = Array.isArray(json.items) ? json.items.map(rowFromDraft) : [];
                    setEntryRows((current) => [...current, ...found].slice(0, 50));
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not read that photo. Add items by hand.");
                  } finally {
                    setBusy(false);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            <input
              ref={snapRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Product snapshot"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void onSnap(file);
              }}
            />
            <MenuEntry
              businessId={businessId}
              layout={layout}
              busy={busy}
              aiReady={aiReady}
              rows={entryRows}
              setRows={setEntryRows}
              paste={paste}
              setPaste={setPaste}
              send={send}
            />
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
            <Card key={item.id} id={`item-${item.id}`}>
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
                      {item.mrpRupees ? <s className="ml-1">{formatRupees(Math.round(item.mrpRupees * 100))}</s> : null}
                      {layout === "FOOD" && item.veg !== "NONE" ? ` · ${item.veg === "NON_VEG" ? "Non-veg" : item.veg === "EGG" ? "Egg" : "Veg"}` : ""}
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
                      <Button type="button" variant="outline" size="sm" className="h-11 min-h-11" disabled={busy} onClick={() => send({ action: "delete", kind: "item", id: item.id }, true)}>
                        Delete
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 min-h-11"
                        disabled={busy}
                        aria-label={`Duplicate ${item.name}`}
                        onClick={async () => {
                          const saved = await send({
                            action: "duplicate",
                            id: item.id,
                            kind: layout === "SERVICES" ? "item" : "variant"
                          }, true);
                          if (saved && saved.variantId) setFocusVariantId(saved.variantId);
                        }}
                      >
                        Duplicate
                      </Button>
                    </div>
                  )}
                </div>
                {canEdit ? (
                  <ItemCopy
                    item={item}
                    layout={layout}
                    busy={busy}
                    onSuggest={suggestCopy}
                    upload={uploadPhoto}
                    onTaken={(code) => openExisting(code, item.id)}
                    onSave={(patch) => send({ action: "update", id: item.id, ...patch }, true)}
                  />
                ) : null}
                {layout === "SERVICES" ? null : (
                  <ItemOptions item={item} layout={layout} canEdit={canEdit} busy={busy} send={send} focusVariantId={focusVariantId} />
                )}
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
  layout,
  busy,
  onSuggest,
  upload,
  onSave,
  onTaken
}: {
  item: Item;
  layout: StoreView;
  busy: boolean;
  onSuggest: (field: CopyField, current: { name: string; nameHi: string }, apply: (text: string) => void) => void;
  upload: (file: File) => Promise<string>;
  onSave: (patch: Record<string, unknown>) => void;
  onTaken?: (code: string) => boolean;
}) {
  const [nameHi, setNameHi] = React.useState(item.nameHi);
  const [description, setDescription] = React.useState(item.description);
  const [brand, setBrand] = React.useState(item.brand);
  const [photo, setPhoto] = React.useState(item.photo || "");
  const [photos, setPhotos] = React.useState(item.photos);
  const [duration, setDuration] = React.useState(item.durationMinutes ? String(item.durationMinutes) : "");
  const [barcode, setBarcode] = React.useState(item.barcode);
  React.useEffect(() => {
    setNameHi(item.nameHi);
    setDescription(item.description);
    setBrand(item.brand);
    setPhoto(item.photo || "");
    setPhotos(item.photos);
    setDuration(item.durationMinutes ? String(item.durationMinutes) : "");
    setBarcode(item.barcode || "");
  }, [item.id, item.nameHi, item.description, item.brand, item.photo, item.photos, item.durationMinutes, item.barcode]);

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
      {layout === "SHOP" ? (
        <>
          <Input aria-label={`Brand for ${item.name}`} value={brand} placeholder="Brand (optional)" onChange={(event) => setBrand(event.target.value)} className="min-h-11" />
          <PhotoFields photo={photo} photos={photos} busy={busy} onCover={setPhoto} onPhotos={setPhotos} upload={upload} />
          <Input
            aria-label={`Barcode for ${item.name}`}
            value={barcode}
            placeholder="Barcode"
            onChange={(event) => setBarcode(event.target.value)}
            onBlur={() => {
              if (onTaken?.(barcode)) setBarcode(item.barcode || "");
            }}
            className="min-h-11"
          />
        </>
      ) : null}
      {layout === "SERVICES" ? (
        <Input aria-label={`Duration for ${item.name}`} inputMode="numeric" value={duration} placeholder="Duration in minutes" onChange={(event) => setDuration(event.target.value)} className="min-h-11" />
      ) : null}
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
        <Button
          type="button"
          className="h-11 min-h-11"
          disabled={busy}
          onClick={() => onSave({
            nameHi,
            description,
            ...(layout === "SHOP" ? { brand, photo, photos, barcode } : {}),
            ...(layout === "SERVICES" ? { durationMinutes: minutesOf(duration) } : {})
          })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function PhotoFields({
  photo,
  photos,
  busy,
  onCover,
  onPhotos,
  upload
}: {
  photo: string;
  photos: string[];
  busy: boolean;
  onCover: (url: string) => void;
  onPhotos: (urls: string[]) => void;
  upload: (file: File) => Promise<string>;
}) {
  const total = (photo ? 1 : 0) + photos.length;
  return (
    <div className="space-y-2">
      <label className="flex h-11 min-h-11 items-center">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Product photo"
          disabled={busy || total >= 6}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const url = await upload(file);
            if (!url) return;
            if (!photo) onCover(url);
            else onPhotos([...photos, url].slice(0, 5));
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground">{total}/6 photos. The first one is the cover.</p>
      {photo ? <p className="text-xs">Cover added</p> : null}
    </div>
  );
}

function ItemOptions({
  item,
  layout,
  canEdit,
  busy,
  send,
  focusVariantId
}: {
  item: Item;
  layout: StoreView;
  canEdit: boolean;
  busy: boolean;
  send: (body: Record<string, unknown>, keepForm?: boolean) => Promise<MenuSave>;
  focusVariantId: string;
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
          {variant.label === "" ? (
            <Input
              aria-label={`Option label for ${item.name}`}
              autoFocus={variant.id === focusVariantId}
              placeholder="Size, colour, or name"
              className="h-11 min-h-11"
              onBlur={(event) => {
                const next = event.target.value.trim();
                if (next) void send({ action: "variant-update", id: variant.id, name: next }, true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          ) : (
            <span>
              {variant.label}
              {variant.size || variant.colour ? ` · ${[variant.size, variant.colour].filter(Boolean).join(" / ")}` : ""}
              {" · "}
              {formatRupees(Math.round(variant.priceRupees * 100))}
              {variant.inStock ? "" : " · Out of stock"}
            </span>
          )}
          {canEdit ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => send({ action: "variant-update", id: variant.id, inStock: !variant.inStock }, true)}>
                {variant.inStock ? "Mark out of stock" : "Mark in stock"}
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
                {addOn.inStock ? "Mark out of stock" : "Mark in stock"}
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
            {layout === "SHOP" ? (
              <>
                <Input aria-label={`Size for ${item.name}`} value={size} placeholder="Size (optional)" onChange={(event) => setSize(event.target.value)} className="min-h-11" />
                <Input aria-label={`Colour for ${item.name}`} value={colour} placeholder="Colour (optional)" onChange={(event) => setColour(event.target.value)} className="min-h-11" />
              </>
            ) : null}
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
