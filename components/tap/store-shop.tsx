"use client";

import * as React from "react";
import { Check, MessageCircle, Plus } from "lucide-react";
import { tapText, type TapLang } from "@/lib/tap/i18n";
import { formatRupees } from "@/lib/tap/order-message";
import { safeImageSrc } from "@/lib/tap/links";
import { askOnWhatsApp } from "@/lib/store/layout";
import { lineUnitPaise, matchVariant, uniqueLabels, usesSizeColour } from "@/lib/store/variants";
import type { StoreCategory, StoreItem } from "./store-menu";

function percentOff(price: number, mrp: number | null) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function ShopCatalog({
  items,
  categories,
  lang,
  label,
  text,
  onAdd,
  askBase
}: {
  items: StoreItem[];
  categories: StoreCategory[];
  lang: TapLang;
  label: (item: { name: string; nameHi: string }) => string;
  text: (key: Parameters<typeof tapText>[1]) => string;
  onAdd: (id: string, variantId: string, addonIds: string[]) => void;
  askBase: string;
}) {
  const [sort, setSort] = React.useState<"price" | "newest">("price");
  const [categoryId, setCategoryId] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [addedId, setAddedId] = React.useState<string | null>(null);
  const brands = Array.from(new Set(items.map((item) => item.brand.trim()).filter(Boolean))).sort();
  const cap = Number(maxPrice);
  const shown = items
    .filter((item) => {
      if (categoryId && item.categoryId !== categoryId) return false;
      if (brand && item.brand.trim() !== brand) return false;
      if (maxPrice.trim() && Number.isFinite(cap) && item.pricePaise > Math.round(cap * 100)) return false;
      return true;
    })
    .sort((a, b) => (sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.pricePaise - b.pricePaise));
  const open = shown.find((item) => item.id === openId) || items.find((item) => item.id === openId) || null;

  return (
    <div>
      <div className="store-chips store-shop-cats" role="group" aria-label={text("filterCategory")}>
        <button type="button" aria-pressed={categoryId === ""} onClick={() => setCategoryId("")}>
          {text("allCategories")}
        </button>
        {categories.map((category) => (
          <button key={category.id} type="button" aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
            {label(category)}
          </button>
        ))}
      </div>
      <div className="store-shop-tools">
        <select aria-label={text("sort")} value={sort} onChange={(event) => setSort(event.target.value as "price" | "newest")}>
          <option value="price">{text("sortPrice")}</option>
          <option value="newest">{text("sortNewest")}</option>
        </select>
        {brands.length > 1 ? (
          <select aria-label={text("filterBrand")} value={brand} onChange={(event) => setBrand(event.target.value)}>
            <option value="">{text("allBrands")}</option>
            {brands.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        ) : null}
        <input
          aria-label={text("filterPrice")}
          inputMode="decimal"
          placeholder={`${text("filterPrice")} ₹`}
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
        />
      </div>
      {shown.length === 0 ? <p className="store-empty">{text("noProducts")}</p> : null}
      <div className="store-shop-grid">
        {shown.map((item) => {
          const src = safeImageSrc(item.photo);
          const off = percentOff(item.pricePaise, item.mrpPaise);
          return (
            <article key={item.id} className="store-shop-card">
              <button type="button" className="store-shop-open" onClick={() => setOpenId(item.id)} aria-label={label(item)}>
                <span className="store-shop-photo">
                  {src ? <img src={src} alt="" loading="lazy" /> : <span aria-hidden="true">{label(item).slice(0, 1)}</span>}
                  {off > 0 ? <span className="store-shop-badge">{off}% off</span> : null}
                </span>
                <span className="store-shop-body">
                  {item.brand.trim() ? <span className="store-shop-brand">{item.brand.trim()}</span> : null}
                  <h3>{label(item)}</h3>
                  <span className="store-price">
                    {formatRupees(item.pricePaise)}
                    {off > 0 && item.mrpPaise ? <s>{formatRupees(item.mrpPaise)}</s> : null}
                  </span>
                </span>
              </button>
              <div className="store-shop-cta">
                {item.variants.length > 0 ? (
                  <button type="button" className="store-shop-add" onClick={() => setOpenId(item.id)}>
                    <Plus aria-hidden="true" />
                    {lang === "hi" ? "विकल्प" : "Options"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="store-shop-add"
                    data-added={addedId === item.id ? "true" : "false"}
                    onClick={() => {
                      onAdd(item.id, "", []);
                      setAddedId(item.id);
                      window.setTimeout(() => setAddedId((current) => (current === item.id ? null : current)), 1400);
                    }}
                  >
                    {addedId === item.id ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                    {addedId === item.id ? (lang === "hi" ? "जुड़ गया" : "Added") : text("add")}
                  </button>
                )}
                {askBase ? (
                  <a
                    className="store-shop-wa"
                    href={askOnWhatsApp(askBase, label(item)) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${text("askWhatsApp")}: ${label(item)}`}
                  >
                    <MessageCircle aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {open ? (
        <ProductSheet
          item={open}
          lang={lang}
          label={label}
          text={text}
          askBase={askBase}
          onClose={() => setOpenId(null)}
          onAdd={onAdd}
        />
      ) : null}
    </div>
  );
}

function ProductSheet({
  item,
  lang,
  label,
  text,
  askBase,
  onClose,
  onAdd
}: {
  item: StoreItem;
  lang: TapLang;
  label: (item: { name: string; nameHi: string }) => string;
  text: (key: Parameters<typeof tapText>[1]) => string;
  askBase: string;
  onClose: () => void;
  onAdd: (id: string, variantId: string, addonIds: string[]) => void;
}) {
  const images = Array.from(
    new Set([item.photo, ...item.photos].map((src) => safeImageSrc(src)).filter((src): src is string => !!src))
  );
  const [image, setImage] = React.useState(0);
  const paired = usesSizeColour(item.variants);
  const stocked = item.variants.find((row) => row.inStock) || item.variants[0];
  const [size, setSize] = React.useState(paired ? stocked?.size.trim() || "" : "");
  const [colour, setColour] = React.useState(paired ? stocked?.colour.trim() || "" : "");
  const [variantId, setVariantId] = React.useState(paired ? "" : item.variants.find((row) => row.inStock)?.id || "");
  const variant = paired ? matchVariant(item.variants, size, colour) : item.variants.find((row) => row.id === variantId) || null;
  const choiceOk = item.variants.length === 0 || (!!variant && variant.inStock);
  const unit = choiceOk ? lineUnitPaise(item.pricePaise, variant, []) : item.pricePaise;
  const ask = askOnWhatsApp(askBase, label(item));
  const optionName = (row: StoreItem["variants"][number]) => (lang === "hi" && row.labelHi ? row.labelHi : row.label);

  return (
    <>
      <div className="store-backdrop" aria-hidden="true" onClick={onClose} />
      <div className="store-sheet" role="dialog" aria-modal="true" aria-label={label(item)}>
        <span className="store-handle" aria-hidden="true" />
        <div className="store-sheet-head">
          <h2>{label(item)}</h2>
          <button type="button" className="store-close" aria-label={text("closeBag")} onClick={onClose}>×</button>
        </div>
        {images.length > 0 ? (
          <>
            <img className="store-shop-hero" src={images[Math.min(image, images.length - 1)]} alt="" />
            {images.length > 1 ? (
              <div className="store-gallery">
                {images.map((src, index) => (
                  <button key={src} type="button" aria-pressed={index === image} onClick={() => setImage(index)}>
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
        {item.brand.trim() ? <p className="store-shop-brand">{item.brand.trim()}</p> : null}
        <p className="store-price">
          {formatRupees(unit)}
          {percentOff(item.pricePaise, item.mrpPaise) > 0 && item.mrpPaise ? <s>{formatRupees(item.mrpPaise)}</s> : null}
        </p>
        {item.description ? <p className="store-desc">{item.description}</p> : null}
        {paired ? (
          <>
            <p className="store-option-label">{text("size")}</p>
            <div className="store-chips" role="group" aria-label={text("size")}>
              {uniqueLabels(item.variants, "size").map((value) => (
                <button key={value} type="button" aria-pressed={size === value} onClick={() => setSize(value)}>{value}</button>
              ))}
            </div>
            <p className="store-option-label">{text("colour")}</p>
            <div className="store-chips" role="group" aria-label={text("colour")}>
              {uniqueLabels(item.variants, "colour").map((value) => (
                <button key={value} type="button" aria-pressed={colour === value} onClick={() => setColour(value)}>{value}</button>
              ))}
            </div>
          </>
        ) : item.variants.length > 0 ? (
          <div className="store-chips" role="group" aria-label={text("chooseOption")}>
            {item.variants.map((row) => (
              <button key={row.id} type="button" aria-pressed={variantId === row.id} disabled={!row.inStock} onClick={() => setVariantId(row.id)}>
                {optionName(row)}
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="store-shop-buy"
          disabled={!choiceOk}
          onClick={() => {
            onAdd(item.id, variant?.id || "", []);
            onClose();
          }}
        >
          {text("addToCart")} · {formatRupees(unit)}
        </button>
        {ask ? (
          <a className="store-shop-ask" href={ask} target="_blank" rel="noopener noreferrer">
            {text("askWhatsApp")}
          </a>
        ) : null}
      </div>
    </>
  );
}
