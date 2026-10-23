"use client";

import * as React from "react";
import { tapText } from "@/lib/tap/i18n";
import { formatRupees } from "@/lib/tap/order-message";
import { DESIGN_PICKER, type StoreDesign } from "@/lib/store/design";
import type { StoreItem } from "./store-menu";
import { BoldStore, MinimalStore, PremiumStore } from "./store-premium";

const END = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();

function sample(id: string, name: string, price: number, mrp: number): StoreItem {
  return {
    id,
    categoryId: "drinks",
    name,
    nameHi: "",
    pricePaise: price,
    mrpPaise: mrp,
    description: "",
    bestseller: false,
    photo: null,
    photos: [],
    brand: "",
    durationMinutes: null,
    createdAt: END,
    veg: "VEG",
    variants: [],
    addOns: []
  };
}

const ITEMS = [sample("coffee", "Filter coffee", 8000, 10000), sample("dosa", "Masala dosa", 12000, 15000)];
const CATEGORIES = [
  { id: "drinks", name: "Drinks", nameHi: "पेय" },
  { id: "food", name: "Food", nameHi: "खाना" }
];
const BANNERS = [
  { id: "hero", title: "Filter coffee and bun", body: "Before 11am", expiresAt: END },
  { id: "lunch", title: "Lunch thali", body: "Weekdays", expiresAt: null },
  { id: "snack", title: "Evening snack", body: "From 4pm", expiresAt: null }
];

function text(key: Parameters<typeof tapText>[1]) {
  return tapText("en", key);
}

const previewProps = {
  code: "preview",
  businessName: "Spice Junction",
  logoUrl: "",
  layout: "FOOD" as const,
  lang: "en" as const,
  setLang: () => undefined,
  query: "",
  setQuery: () => undefined,
  vegOnly: false,
  setVegOnly: () => undefined,
  categories: CATEGORIES,
  items: ITEMS,
  sections: [{ id: "drinks", title: "Drinks", items: ITEMS }],
  banners: BANNERS,
  coupons: [],
  label: (row: { name: string; nameHi: string }) => row.name,
  text,
  count: 1,
  qtyOf: () => 0,
  onChange: () => undefined,
  onOpenCart: () => undefined,
  askBase: "",
  preview: true
};

function Phone({ children, accent, accentInk }: { children: React.ReactNode; accent: string; accentInk: string }) {
  return (
    <span aria-hidden="true" className="block overflow-hidden rounded-2xl border bg-white" style={{ width: 112, height: 200 }}>
      <span
        className="block"
        style={{
          width: 360,
          height: 640,
          transform: "scale(0.3111)",
          transformOrigin: "top left",
          ["--store-cta" as string]: accent,
          ["--store-cta-ink" as string]: accentInk
        }}
      >
        {children}
      </span>
    </span>
  );
}

function ClassicPreview() {
  return (
    <div className="store-page" style={{ background: "#fff", minHeight: 640 }}>
      <div className="store-wrap">
        <h1>Spice Junction</h1>
        <p className="store-sub">Order on WhatsApp · 0% commission</p>
        <ul className="store-list">
          {ITEMS.map((row) => (
            <li key={row.id} className="store-item" data-photo="false">
              <div className="store-item-info">
                <h3 className="store-name">{row.name}</h3>
                <p className="store-price">
                  {formatRupees(row.pricePaise)} <s>{formatRupees(row.mrpPaise || 0)}</s>
                </p>
              </div>
              <div className="store-item-side">
                <span className="store-add">ADD</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Wraps a non-interactive preview: hidden from screen readers and skipped by Tab. */
function InertPreview({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.setAttribute("inert", "");
  }, []);
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none">
      {children}
    </div>
  );
}

export function DesignPicker({
  value,
  onChange,
  accent,
  accentInk
}: {
  value: StoreDesign;
  onChange: (value: StoreDesign) => void;
  accent: string;
  accentInk: string;
}) {
  return (
    <div role="group" aria-label="Store design" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {DESIGN_PICKER.map((choice) => (
        <div
          key={choice.id}
          className={`relative flex flex-col items-center gap-2 rounded-xl border p-2 text-sm ${value === choice.id ? "border-primary ring-2 ring-primary" : ""}`}
        >
          {/* The preview is a picture of a store, not a control: no nested buttons, no tab stops. */}
          <InertPreview>
            <Phone accent={accent} accentInk={accentInk}>
              {choice.id === "CLASSIC" ? (
                <ClassicPreview />
              ) : choice.id === "MINIMAL" ? (
                <MinimalStore {...previewProps} />
              ) : choice.id === "BOLD" ? (
                <BoldStore {...previewProps} />
              ) : (
                <PremiumStore {...previewProps} />
              )}
            </Phone>
          </InertPreview>
          <button
            type="button"
            aria-pressed={value === choice.id}
            onClick={() => onChange(choice.id)}
            className="min-h-11 w-full rounded-lg font-medium after:absolute after:inset-0 after:rounded-xl after:content-['']"
          >
            {choice.label}
          </button>
        </div>
      ))}
    </div>
  );
}
