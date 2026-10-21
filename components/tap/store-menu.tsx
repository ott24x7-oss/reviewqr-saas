"use client";

import * as React from "react";
import { BookOpen, ChevronLeft, Minus, Plus, Search, ShoppingBag, Star, X } from "lucide-react";
import Link from "next/link";
import { tapText, type TapLang } from "@/lib/tap/i18n";
import { formatRupees } from "@/lib/tap/order-message";
import { safeImageSrc } from "@/lib/tap/links";
import { enabledOrderTypes, quoteOrder, type OrderType, type StoreRules } from "@/lib/store/pricing";
import { lineUnitPaise, matchVariant, resolveChoice, uniqueLabels, usesSizeColour } from "@/lib/store/variants";
import { couponDiscount, type CouponFail, type CouponRule } from "@/lib/store/coupons";
import type { StoreView } from "@/lib/store/layout";
import type { DesignCoupon, StoreDesign } from "@/lib/store/design";
import dynamic from "next/dynamic";
import { ShopCatalog } from "./store-shop";
import { ServicesCatalog } from "./store-services";

const PremiumStore = dynamic(() => import("./store-premium").then((mod) => mod.PremiumStore));
const MinimalStore = dynamic(() => import("./store-premium").then((mod) => mod.MinimalStore));
const BoldStore = dynamic(() => import("./store-premium").then((mod) => mod.BoldStore));

export type StoreVariant = {
  id: string;
  label: string;
  labelHi: string;
  size: string;
  colour: string;
  pricePaise: number;
  inStock: boolean;
};

export type StoreAddOn = {
  id: string;
  name: string;
  nameHi: string;
  pricePaise: number;
  inStock: boolean;
};

export type StoreItem = {
  id: string;
  categoryId: string | null;
  name: string;
  nameHi: string;
  pricePaise: number;
  mrpPaise: number | null;
  description: string;
  bestseller: boolean;
  photo: string | null;
  photos: string[];
  brand: string;
  durationMinutes: number | null;
  createdAt: string;
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
  variants: StoreVariant[];
  addOns: StoreAddOn[];
};

export type StoreCategory = { id: string; name: string; nameHi: string };

type Line = { key: string; id: string; variantId: string; addonIds: string[]; qty: number; note: string };

function lineKey(id: string, variantId: string, addonIds: string[]) {
  return `${id}|${variantId}|${[...addonIds].sort().join(",")}`;
}

function needsSheet(item: StoreItem) {
  return item.variants.some((row) => row.inStock) || (item.variants.length === 0 && item.addOns.some((row) => row.inStock));
}

function soldOut(item: StoreItem) {
  return item.variants.length > 0 && !item.variants.some((row) => row.inStock);
}

function rowPrice(item: StoreItem) {
  const stocked = item.variants.filter((row) => row.inStock);
  if (!stocked.length) return { paise: item.pricePaise, from: false };
  const min = Math.min(...stocked.map((row) => row.pricePaise));
  return { paise: min, from: stocked.some((row) => row.pricePaise !== min) };
}

function unitOf(item: StoreItem, line: Line) {
  const variant = item.variants.find((row) => row.id === line.variantId) || null;
  const addOns = item.addOns.filter((row) => line.addonIds.includes(row.id));
  return lineUnitPaise(item.pricePaise, variant, addOns);
}

function readLine(raw: unknown, catalog: StoreItem[]): Line | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { id?: unknown; qty?: unknown; note?: unknown; variantId?: unknown; addonIds?: unknown };
  if (typeof row.id !== "string" || typeof row.qty !== "number" || row.qty <= 0) return null;
  const item = catalog.find((entry) => entry.id === row.id);
  if (!item) return null;
  const addonIds = Array.isArray(row.addonIds) ? row.addonIds.filter((id): id is string => typeof id === "string") : [];
  const choice = resolveChoice({
    itemPricePaise: item.pricePaise,
    variants: item.variants,
    addOns: item.addOns,
    variantId: typeof row.variantId === "string" ? row.variantId : "",
    addonIds
  });
  if (!choice.ok) return null;
  const ids = choice.addOns.map((addOn) => addOn.id);
  const variantId = choice.variant?.id || "";
  return {
    key: lineKey(row.id, variantId, ids),
    id: row.id,
    variantId,
    addonIds: ids,
    qty: Math.min(20, Math.round(row.qty)),
    note: typeof row.note === "string" ? row.note : ""
  };
}

export function StoreMenu({
  code,
  channel,
  businessName,
  items,
  categories,
  rules,
  closed,
  tableLabel,
  banners,
  upiId,
  themeStyle,
  layout,
  design = "CLASSIC",
  logoUrl = "",
  coupons = [],
  homeHref,
  askBase
}: {
  code: string;
  channel: "q" | "t";
  businessName: string;
  items: StoreItem[];
  categories: StoreCategory[];
  rules: StoreRules;
  closed: boolean;
  tableLabel: string;
  banners: { id: string; title: string; body: string; expiresAt?: string | null }[];
  upiId: string;
  themeStyle?: React.CSSProperties;
  layout: StoreView;
  design?: StoreDesign;
  logoUrl?: string;
  coupons?: DesignCoupon[];
  homeHref?: string;
  askBase?: string;
}) {
  const [lang, setLang] = React.useState<TapLang>("en");
  const [query, setQuery] = React.useState("");
  const [vegOnly, setVegOnly] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [cart, setCart] = React.useState<Line[]>([]);
  const [ready, setReady] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const orderTypes = enabledOrderTypes(rules);
  const [orderType, setOrderType] = React.useState<OrderType>(orderTypes[0] || "DINE_IN");
  const [payment, setPayment] = React.useState<"CASH" | "UPI">("CASH");
  const [name, setName] = React.useState("");
  const [table, setTable] = React.useState(tableLabel);
  const [address, setAddress] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [note, setNote] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [picking, setPicking] = React.useState<string | null>(null);
  const [couponInput, setCouponInput] = React.useState("");
  const [coupon, setCoupon] = React.useState<CouponRule & { code: string } | null>(null);
  const [couponError, setCouponError] = React.useState("");
  const [couponBusy, setCouponBusy] = React.useState(false);
  const storageKey = `rq-cart:${code}`;

  React.useEffect(() => {
    const storedLang = window.localStorage.getItem("rq-lang");
    if (storedLang === "hi" || storedLang === "en") setLang(storedLang);
    else if (window.navigator.language.toLowerCase().includes("hi")) setLang("hi");
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      setCart(Array.isArray(stored) ? stored.map((line) => readLine(line, items)).filter((line): line is Line => !!line) : []);
    } catch {
      setCart([]);
    }
    setReady(true);
    // The catalogue is fixed for this page. Reloading when its identity changes would wipe the cart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  React.useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
    window.localStorage.setItem("rq-lang", lang);
  }, [cart, lang, ready, storageKey]);

  const text = (key: Parameters<typeof tapText>[1]) => tapText(lang, key);
  const pickingItem = items.find((item) => item.id === picking) || null;
  const label = (item: { name: string; nameHi: string }) => (lang === "hi" && item.nameHi ? item.nameHi : item.name);
  const visible = items.filter((item) => {
    if (layout === "FOOD" && vegOnly && item.veg !== "VEG") return false;
    if (!query.trim()) return true;
    const hay = `${item.name} ${item.nameHi} ${item.description} ${item.brand || ""}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const count = cart.reduce((sum, line) => sum + line.qty, 0);
  const itemTotal = cart.reduce((sum, line) => {
    const item = items.find((row) => row.id === line.id);
    return sum + (item ? unitOf(item, line) * line.qty : 0);
  }, 0);
  const decision = coupon ? couponDiscount(coupon, itemTotal) : null;
  const discountPaise = decision?.ok ? decision.discountPaise : 0;
  const quote = quoteOrder({
    rules,
    orderType,
    subtotalPaise: itemTotal,
    discountPaise,
    pincode,
    orderForLater: closed
  });
  const total = quote.ok ? quote.totalPaise : itemTotal;

  function qtyOf(id: string) {
    return cart.filter((line) => line.id === id).reduce((sum, line) => sum + line.qty, 0);
  }

  function addConfigured(id: string, variantId: string, addonIds: string[]) {
    const ids = [...addonIds].sort();
    const key = lineKey(id, variantId, ids);
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (!existing) return [...current, { key, id, variantId, addonIds: ids, qty: 1, note: "" }];
      return current.map((line) => (line.key === key ? { ...line, qty: Math.min(20, line.qty + 1) } : line));
    });
    setPicking(null);
  }

  function changeItem(item: StoreItem, delta: number) {
    if (delta > 0) {
      if (soldOut(item)) return;
      if (needsSheet(item)) {
        setPicking(item.id);
        return;
      }
      addConfigured(item.id, "", []);
      return;
    }
    setCart((current) => {
      const indexFromEnd = [...current].reverse().findIndex((line) => line.id === item.id);
      if (indexFromEnd < 0) return current;
      const at = current.length - 1 - indexFromEnd;
      const line = current[at];
      if (line.qty <= 1) return current.filter((_, index) => index !== at);
      return current.map((row, index) => (index === at ? { ...row, qty: row.qty - 1 } : row));
    });
  }

  function setLineQty(key: string, qty: number) {
    setCart((current) => {
      if (qty <= 0) return current.filter((line) => line.key !== key);
      return current.map((line) => (line.key === key ? { ...line, qty: Math.min(20, qty) } : line));
    });
  }

  async function placeOrder() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          lang,
          orderType,
          customerName: name,
          tableOrAddress: orderType === "DELIVERY" ? address : orderType === "DINE_IN" ? table : "",
          pincode: orderType === "DELIVERY" ? pincode : "",
          note,
          ...(decision?.ok && coupon ? { coupon: coupon.code } : {}),
          payment: upiId && payment === "UPI" ? "UPI" : "CASH",
          ...(consent ? { customerPhone: phone, consent: true } : { consent: false }),
          items: cart.map((line) => ({
            id: line.id,
            qty: line.qty,
            note: line.note,
            ...(line.variantId ? { variantId: line.variantId } : {}),
            ...(line.addonIds.length ? { addonIds: line.addonIds } : {})
          }))
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not place the order");
      if (typeof json.track === "string") window.localStorage.setItem(`rq-last-order:${code}`, json.track);
      setCart([]);
      setOpen(false);
      if (json.url) window.location.href = json.url;
      else if (typeof json.track === "string") window.location.href = json.track;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  }

  async function applyCoupon() {
    setCouponBusy(true);
    setCouponError("");
    try {
      const res = await fetch("/api/public/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, coupon: couponInput, subtotalPaise: itemTotal, lang })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.coupon) throw new Error(json.error || text("couponInvalid"));
      setCoupon(json.coupon);
    } catch (err) {
      setCoupon(null);
      setCouponError(err instanceof Error ? err.message : text("couponInvalid"));
    } finally {
      setCouponBusy(false);
    }
  }

  const sections = React.useMemo(() => {
    const groups: Array<{ id: string; title: string; items: StoreItem[] }> = [];
    const best = visible.filter((item) => item.bestseller);
    if (best.length > 0 && !query.trim()) {
      groups.push({ id: "recommended", title: text("recommended"), items: best });
    }
    for (const category of categories) {
      const rows = visible.filter((item) => item.categoryId === category.id);
      if (rows.length) groups.push({ id: category.id, title: label(category), items: rows });
    }
    const loose = visible.filter((item) => !item.categoryId || !categories.some((c) => c.id === item.categoryId));
    if (loose.length) groups.push({ id: "more", title: lang === "hi" ? "और" : "More", items: loose });
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, categories, lang, query]);

  function jumpTo(id: string) {
    setMenuOpen(false);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const designed = design === "PREMIUM" || design === "MINIMAL" || design === "BOLD";
  const DesignShell = design === "MINIMAL" ? MinimalStore : design === "BOLD" ? BoldStore : PremiumStore;
  const pageStyle = designed && themeStyle ? { ...themeStyle, background: undefined } : themeStyle;

  return (
    <div className="store-page" data-design={design} style={pageStyle}>
      {designed ? (
        <DesignShell
          code={code}
          businessName={businessName}
          logoUrl={logoUrl}
          layout={layout}
          lang={lang}
          setLang={setLang}
          query={query}
          setQuery={setQuery}
          vegOnly={vegOnly}
          setVegOnly={setVegOnly}
          categories={categories}
          items={visible}
          sections={sections}
          banners={banners.map((banner) => ({
            id: banner.id,
            title: banner.title,
            body: banner.body,
            expiresAt: banner.expiresAt || null
          }))}
          coupons={coupons}
          label={label}
          text={text}
          count={count}
          qtyOf={qtyOf}
          onChange={changeItem}
          onOpenCart={() => setOpen(true)}
          askBase={askBase || ""}
        />
      ) : (
      <div className="store-wrap">
        <header className="store-head">
          <div className="store-head-row">
            <Link className="store-back" href={homeHref || `/${channel}/${code}`} aria-label={businessName}>
              <ChevronLeft aria-hidden="true" />
            </Link>
            <div className="tap-lang store-lang" role="group" aria-label="Language">
              <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                EN
              </button>
              <button type="button" aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">
                हिं
              </button>
            </div>
          </div>
          <h1>{businessName}</h1>
          <p className="store-sub">
            {layout === "SHOP" ? text("storeLeadShop") : layout === "SERVICES" ? text("storeLeadServices") : lang === "hi" ? "WhatsApp पर ऑर्डर करें · कोई कमीशन नहीं" : "Order on WhatsApp · 0% commission"}
          </p>
          {closed || layout === "FOOD" ? (
            <p className="store-closed" data-closed={closed ? "true" : "false"}>
              {closed ? `${text("closedLater")}. ` : ""}
              {layout === "FOOD" ? `${text("prepLead")} ${rules.prepMinutes} ${text("prepTail")}` : ""}
            </p>
          ) : null}
          <div className="store-tools">
            <label className="store-search-wrap">
              <Search aria-hidden="true" />
              <input
                className="store-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={layout === "SHOP" ? text("searchProducts") : layout === "SERVICES" ? text("searchServices") : text("search")}
                aria-label={layout === "SHOP" ? text("searchProducts") : layout === "SERVICES" ? text("searchServices") : text("search")}
              />
            </label>
            {layout === "FOOD" ? <button
              type="button"
              className="store-veg"
              aria-pressed={vegOnly}
              onClick={() => setVegOnly((value) => !value)}
            >
              <span className="store-veg-track" aria-hidden="true">
                <span className="store-veg-knob">
                  <VegMark kind="VEG" />
                </span>
              </span>
              {text("vegOnly")}
            </button> : null}
          </div>
        </header>

        {banners.length > 0 ? (
          <div className="store-offers">
            {banners.map((banner) => (
              <div key={banner.id} className="store-offer">
                <strong>{banner.title}</strong>
                {banner.body ? <p>{banner.body}</p> : null}
              </div>
            ))}
          </div>
        ) : null}

        {layout === "SHOP" ? (
          <ShopCatalog
            items={visible}
            categories={categories}
            lang={lang}
            label={label}
            text={text}
            askBase={askBase || ""}
            onAdd={addConfigured}
          />
        ) : layout === "SERVICES" ? (
          <ServicesCatalog
            items={visible}
            label={label}
            text={text}
            askBase={askBase || ""}
            onBook={(item) => changeItem(item, 1)}
          />
        ) : (
          <>
        {items.length === 0 ? <p className="store-empty">{text("emptyMenu")}</p> : null}
        {items.length > 0 && sections.length === 0 ? <p className="store-empty">{text("noMatch")}</p> : null}

        {sections.map((section) => (
          <section key={section.id} id={`sec-${section.id}`} className="store-section">
            <h2 className="store-section-title">
              {section.title} <span>({section.items.length})</span>
            </h2>
            <ul className="store-list">
              {section.items.map((item) => {
                const qty = qtyOf(item.id);
                const photo = safeImageSrc(item.photo);
                const priced = rowPrice(item);
                const unavailable = soldOut(item);
                return (
                  <li key={`${section.id}-${item.id}`} className="store-item" data-photo={photo ? "true" : "false"}>
                    <div className="store-item-info">
                      <div className="store-item-marks">
                        {item.veg !== "NONE" ? <VegMark kind={item.veg} /> : null}
                        {item.bestseller ? (
                          <span className="store-best">
                            <Star aria-hidden="true" /> {text("bestseller")}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="store-name">{label(item)}</h3>
                      <p className="store-price">
                        {priced.from ? `${text("priceFrom")} ` : ""}
                        {formatRupees(priced.paise)}
                        {item.variants.length === 0 && item.mrpPaise && item.mrpPaise > item.pricePaise ? (
                          <>
                            <s>{formatRupees(item.mrpPaise)}</s>
                            <span className="store-off">
                              {Math.round(((item.mrpPaise - item.pricePaise) / item.mrpPaise) * 100)}% off
                            </span>
                          </>
                        ) : null}
                      </p>
                      {item.description ? <p className="store-desc">{item.description}</p> : null}
                    </div>
                    <div className="store-item-side">
                      {photo ? <img className="store-thumb" src={photo} alt="" loading="lazy" /> : null}
                      {unavailable ? (
                        <button type="button" className="store-add" disabled>
                          {text("outOfStock")}
                        </button>
                      ) : qty === 0 ? (
                        <button type="button" className="store-add" onClick={() => changeItem(item, 1)} aria-label={`${text("add")} ${label(item)}`}>
                          {text("add").toUpperCase()}
                          <Plus aria-hidden="true" />
                        </button>
                      ) : (
                        <div className="store-step" role="group" aria-label={label(item)}>
                          <button type="button" aria-label="Decrease" onClick={() => changeItem(item, -1)}>
                            <Minus aria-hidden="true" />
                          </button>
                          <span aria-live="polite">{qty}</span>
                          <button type="button" aria-label="Increase" onClick={() => changeItem(item, 1)}>
                            <Plus aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
          </>
        )}
      </div>
      )}

      {layout === "FOOD" && !designed && sections.length > 1 ? (
        <button type="button" className="store-menu-fab" data-raised={count > 0 ? "true" : "false"} onClick={() => setMenuOpen(true)}>
          <BookOpen aria-hidden="true" />
          {text("menu").toUpperCase()}
        </button>
      ) : null}

      {menuOpen ? (
        <>
          <div className="store-backdrop" aria-hidden="true" onClick={() => setMenuOpen(false)} />
          <nav className="store-menu-sheet" aria-label={text("menu")}>
            {sections.map((section) => (
              <button key={section.id} type="button" onClick={() => jumpTo(section.id)}>
                <span>{section.title}</span>
                <span>{section.items.length}</span>
              </button>
            ))}
          </nav>
        </>
      ) : null}

      {!designed && count > 0 ? (
        <button type="button" className="store-bar" onClick={() => setOpen(true)}>
          <span className="store-bar-count">
            {count} {count === 1 ? (lang === "hi" ? "आइटम" : "item") : lang === "hi" ? "आइटम" : "items"} {text("itemsAdded")}
            <small>{formatRupees(total)}</small>
          </span>
          <span className="store-bar-cta">
            {text("viewCart")}
            <ShoppingBag aria-hidden="true" />
          </span>
        </button>
      ) : null}
      {open ? (
        <>
        <div className="store-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
        <div className="store-sheet" role="dialog" aria-modal="true" aria-label={text("yourOrder")}>
          <span className="store-handle" aria-hidden="true" />
          <div className="store-sheet-head">
            <h2>{text("yourOrder")}</h2>
            <button type="button" className="store-close" aria-label={text("closeBag")} onClick={() => setOpen(false)}>
              <X aria-hidden="true" />
            </button>
          </div>
          {cart.map((line) => {
            const item = items.find((row) => row.id === line.id);
            if (!item) return null;
            const variant = item.variants.find((row) => row.id === line.variantId);
            const addOnNames = item.addOns.filter((row) => line.addonIds.includes(row.id)).map((row) => label(row));
            const variantLabel = variant ? (lang === "hi" && variant.labelHi ? variant.labelHi : variant.label) : "";
            return (
              <div key={line.key} className="store-line">
                <div className="store-line-top">
                  <strong className="store-line-name">{label(item)}</strong>
                  {variantLabel || addOnNames.length ? (
                    <span className="store-line-meta">{[variantLabel, ...addOnNames].filter(Boolean).join(" · ")}</span>
                  ) : null}
                  <span className="store-line-price">{formatRupees(unitOf(item, line) * line.qty)}</span>
                </div>
                <div className="store-step store-step-sm">
                  <button type="button" aria-label="Decrease" onClick={() => setLineQty(line.key, line.qty - 1)}>−</button>
                  <span style={{ alignSelf: "center", textAlign: "center" }}>{line.qty}</span>
                  <button type="button" aria-label="Increase" onClick={() => setLineQty(line.key, line.qty + 1)}>+</button>
                </div>
                <input
                  aria-label={text("note")}
                  value={line.note}
                  placeholder={text("note")}
                  onChange={(event) =>
                    setCart((current) => current.map((row) => (row.key === line.key ? { ...row, note: event.target.value } : row)))
                  }
                />
              </div>
            );
          })}
          <div className="store-coupon">
            <input
              aria-label={text("coupon")}
              value={couponInput}
              placeholder={text("coupon")}
              onChange={(event) => setCouponInput(event.target.value)}
            />
            <button type="button" disabled={couponBusy || couponInput.trim().length < 3} onClick={applyCoupon}>
              {text("apply")}
            </button>
          </div>
          {coupon && decision?.ok ? (
            <p className="store-privacy store-coupon-note">
              {coupon.code} · {formatRupees(discountPaise)}{" "}
              <button type="button" onClick={() => { setCoupon(null); setCouponError(""); }}>{text("remove")}</button>
            </p>
          ) : null}
          {couponError ? <p className="store-privacy">{couponError}</p> : null}
          {decision && !decision.ok ? <p className="store-privacy">{couponText(lang, decision.code)}</p> : null}
          {quote.ok ? (
            <div className="store-break">
              <div><span>{text("subtotal")}</span><strong>{formatRupees(quote.subtotalPaise)}</strong></div>
              {quote.discountPaise > 0 ? <div><span>{text("discount")}</span><strong>−{formatRupees(quote.discountPaise)}</strong></div> : null}
              {quote.packingPaise > 0 ? <div><span>{text("packing")}</span><strong>{formatRupees(quote.packingPaise)}</strong></div> : null}
              {orderType === "DELIVERY" ? <div><span>{text("deliveryCharge")}</span><strong>{formatRupees(quote.deliveryPaise)}</strong></div> : null}
              {quote.gstPaise > 0 ? (
                <div>
                  <span>{quote.pricesIncludeGst ? text("gstIncluded") : text("gstExtra")}</span>
                  <strong>{formatRupees(quote.gstPaise)}</strong>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="store-total">
            <span>{text("total")}</span>
            <strong>{formatRupees(total)}</strong>
          </div>
          {upiId ? (
            <div className="store-types" role="group" aria-label={text("payment")}>
              <button type="button" aria-pressed={payment === "CASH"} onClick={() => setPayment("CASH")}>{text("payCash")}</button>
              <button type="button" aria-pressed={payment === "UPI"} onClick={() => setPayment("UPI")}>{text("payUpi")}</button>
            </div>
          ) : null}
          {orderTypes.length > 0 ? (
            <div className="store-types" role="group" aria-label={text("orderType")}>
              {orderTypes.map((type) => (
                <button key={type} type="button" aria-pressed={orderType === type} onClick={() => setOrderType(type)}>
                  {type === "DINE_IN" ? text("dineIn") : type === "TAKEAWAY" ? text("takeaway") : text("homeDelivery")}
                </button>
              ))}
            </div>
          ) : null}
          <input aria-label={text("customerName")} value={name} placeholder={text("customerName")} onChange={(event) => setName(event.target.value)} />
          <label className="store-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>{text("consentOrder")}</span>
          </label>
          <input
            aria-label={text("phone")}
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            placeholder={text("phone")}
            onChange={(event) => setPhone(event.target.value)}
          />
          {orderType === "DINE_IN" ? (
            <input aria-label={text("tableNumber")} value={table} placeholder={text("tableNumber")} onChange={(event) => setTable(event.target.value)} />
          ) : null}
          {orderType === "DELIVERY" ? (
            <>
              <input aria-label={text("deliveryAddress")} value={address} placeholder={text("deliveryAddress")} onChange={(event) => setAddress(event.target.value)} />
              <input aria-label={text("pincode")} inputMode="numeric" value={pincode} placeholder={text("pincode")} onChange={(event) => setPincode(event.target.value)} />
            </>
          ) : null}
          <textarea aria-label={text("note")} value={note} placeholder={text("note")} onChange={(event) => setNote(event.target.value)} />
          <p className="store-privacy">
            {text("privacyOrder")} <Link href="/privacy">{text("privacyLink")}</Link>
          </p>
          {!quote.ok ? <p className="store-privacy">{quoteMessage(lang, quote.code, quote.shortfallPaise)}</p> : null}
          {error ? <p className="store-privacy">{error}</p> : null}
          <button type="button" className="store-order" disabled={busy || count === 0 || !quote.ok} onClick={placeOrder}>
            {(layout === "SHOP" ? text("buyWhatsApp") : layout === "SERVICES" ? text("bookWhatsApp") : text("orderWhatsApp"))} · {formatRupees(total)}
          </button>
        </div>
        </>
      ) : null}
      {pickingItem ? (
        <OptionSheet
          item={pickingItem}
          lang={lang}
          text={text}
          onClose={() => setPicking(null)}
          onAdd={(variantId, addonIds) => addConfigured(pickingItem.id, variantId, addonIds)}
        />
      ) : null}
    </div>
  );
}

function OptionSheet({
  item,
  lang,
  text,
  onClose,
  onAdd
}: {
  item: StoreItem;
  lang: TapLang;
  text: (key: Parameters<typeof tapText>[1]) => string;
  onClose: () => void;
  onAdd: (variantId: string, addonIds: string[]) => void;
}) {
  const paired = usesSizeColour(item.variants);
  const stocked = item.variants.find((row) => row.inStock) || item.variants[0];
  const [size, setSize] = React.useState(paired ? stocked?.size.trim() || "" : "");
  const [colour, setColour] = React.useState(paired ? stocked?.colour.trim() || "" : "");
  const [variantId, setVariantId] = React.useState(paired ? "" : item.variants.find((row) => row.inStock)?.id || "");
  const [addonIds, setAddonIds] = React.useState<string[]>([]);
  const variant = paired ? matchVariant(item.variants, size, colour) : item.variants.find((row) => row.id === variantId) || null;
  const addOns = item.addOns.filter((row) => addonIds.includes(row.id));
  const choiceOk = (item.variants.length === 0 || (!!variant && variant.inStock)) && addOns.every((row) => row.inStock);
  const unit = choiceOk ? lineUnitPaise(item.pricePaise, variant, addOns) : 0;
  const optionName = (row: StoreVariant) => (lang === "hi" && row.labelHi ? row.labelHi : row.label);
  const addOnName = (row: StoreAddOn) => (lang === "hi" && row.nameHi ? row.nameHi : row.name);

  return (
    <>
      <div className="store-backdrop store-pick-back" aria-hidden="true" onClick={onClose} />
      <div className="store-sheet store-pick" role="dialog" aria-modal="true" aria-label={lang === "hi" && item.nameHi ? item.nameHi : item.name}>
        <span className="store-handle" aria-hidden="true" />
        <div className="store-sheet-head">
          <h2>{lang === "hi" && item.nameHi ? item.nameHi : item.name}</h2>
          <button type="button" className="store-close" aria-label={text("closeBag")} onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        {paired ? (
          <>
            <p className="store-option-label">{text("size")}</p>
            <div className="store-chips" role="group" aria-label={text("size")}>
              {uniqueLabels(item.variants, "size").map((value) => (
                <button key={value} type="button" aria-pressed={size === value} onClick={() => setSize(value)}>
                  {value}
                </button>
              ))}
            </div>
            <p className="store-option-label">{text("colour")}</p>
            <div className="store-chips" role="group" aria-label={text("colour")}>
              {uniqueLabels(item.variants, "colour").map((value) => {
                const match = matchVariant(item.variants, size, value);
                const disabled = !match || !match.inStock;
                return (
                  <button key={value} type="button" aria-pressed={colour === value} disabled={disabled} onClick={() => setColour(value)}>
                    {value}
                  </button>
                );
              })}
            </div>
          </>
        ) : item.variants.length > 0 ? (
          <>
            <p className="store-option-label">{text("chooseOption")}</p>
            <div className="store-chips" role="group" aria-label={text("chooseOption")}>
              {item.variants.map((row) => (
                <button key={row.id} type="button" aria-pressed={variantId === row.id} disabled={!row.inStock} onClick={() => setVariantId(row.id)}>
                  {optionName(row)} · {formatRupees(row.pricePaise)}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {item.addOns.length > 0 ? (
          <>
            <p className="store-option-label">{text("addOns")}</p>
            {item.addOns.map((row) => (
              <label key={row.id} className="store-addon">
                <input
                  type="checkbox"
                  checked={addonIds.includes(row.id)}
                  disabled={!row.inStock}
                  onChange={(event) =>
                    setAddonIds((current) =>
                      event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id)
                    )
                  }
                />
                <span>
                  {addOnName(row)}
                  {row.pricePaise > 0 ? ` · ${formatRupees(row.pricePaise)}` : ""}
                  {row.inStock ? "" : ` · ${text("outOfStock")}`}
                </span>
              </label>
            ))}
          </>
        ) : null}
        {choiceOk ? null : <p className="store-privacy">{text("outOfStock")}</p>}
        <button
          type="button"
          className="store-order"
          disabled={!choiceOk}
          onClick={() => onAdd(variant?.id || "", addOns.map((row) => row.id))}
        >
          {text("addToOrder")}
          {choiceOk ? ` · ${formatRupees(unit)}` : ""}
        </button>
      </div>
    </>
  );
}

function couponText(lang: TapLang, code: CouponFail) {
  if (code === "expired") return tapText(lang, "couponExpired");
  if (code === "minimum") return tapText(lang, "couponMinimum");
  if (code === "used") return tapText(lang, "couponUsed");
  return tapText(lang, "couponInvalid");
}

function quoteMessage(lang: TapLang, code: "order_type" | "min_order" | "pincode", shortfallPaise?: number) {
  if (code === "min_order") {
    const more = formatRupees(shortfallPaise || 0);
    return lang === "hi" ? `न्यूनतम ऑर्डर के लिए ${more} और जोड़ें।` : `Add ${more} more to reach the minimum order.`;
  }
  if (code === "pincode") return lang === "hi" ? "हम इस पिनकोड पर डिलीवरी नहीं करते।" : "We don't deliver to that pincode.";
  return lang === "hi" ? "यह ऑर्डर प्रकार उपलब्ध नहीं है।" : "That order type isn't available.";
}

/** Indian food-label style mark: square outline with a dot (veg) or triangle (non-veg). */
function VegMark({ kind }: { kind: StoreItem["veg"] }) {
  const tone = kind === "VEG" ? "veg" : kind === "EGG" ? "egg" : "nonveg";
  const name = kind === "VEG" ? "Veg" : kind === "EGG" ? "Egg" : "Non-veg";
  return (
    <span className="store-mark" data-tone={tone} role="img" aria-label={name}>
      <span />
    </span>
  );
}
