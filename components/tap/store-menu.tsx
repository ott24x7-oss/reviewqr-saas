"use client";

import * as React from "react";
import Link from "next/link";
import { tapText, type TapLang } from "@/lib/tap/i18n";
import { formatRupees } from "@/lib/tap/order-message";
import { safeImageSrc } from "@/lib/tap/links";

export type StoreItem = {
  id: string;
  categoryId: string | null;
  name: string;
  nameHi: string;
  pricePaise: number;
  photo: string | null;
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
};

export type StoreCategory = { id: string; name: string; nameHi: string };

type Line = { id: string; qty: number; note: string };

export function StoreMenu({
  code,
  channel,
  businessName,
  items,
  categories,
  themeStyle
}: {
  code: string;
  channel: "q" | "t";
  businessName: string;
  items: StoreItem[];
  categories: StoreCategory[];
  themeStyle?: React.CSSProperties;
}) {
  const [lang, setLang] = React.useState<TapLang>("en");
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("all");
  const [cart, setCart] = React.useState<Line[]>([]);
  const [ready, setReady] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [table, setTable] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const storageKey = `rq-cart:${code}`;

  React.useEffect(() => {
    const storedLang = window.localStorage.getItem("rq-lang");
    if (storedLang === "hi" || storedLang === "en") setLang(storedLang);
    else if (window.navigator.language.toLowerCase().includes("hi")) setLang("hi");
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(stored)) setCart(stored.filter((line) => line && typeof line.id === "string" && line.qty > 0));
    } catch {
      setCart([]);
    }
    setReady(true);
  }, [storageKey]);

  React.useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
    window.localStorage.setItem("rq-lang", lang);
  }, [cart, lang, ready, storageKey]);

  const text = (key: Parameters<typeof tapText>[1]) => tapText(lang, key);
  const label = (item: { name: string; nameHi: string }) => (lang === "hi" && item.nameHi ? item.nameHi : item.name);
  const visible = items.filter((item) => {
    if (categoryId !== "all" && item.categoryId !== categoryId) return false;
    if (!query.trim()) return true;
    const hay = `${item.name} ${item.nameHi}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const count = cart.reduce((sum, line) => sum + line.qty, 0);
  const total = cart.reduce((sum, line) => {
    const item = items.find((row) => row.id === line.id);
    return sum + (item ? item.pricePaise * line.qty : 0);
  }, 0);

  function qtyOf(id: string) {
    return cart.find((line) => line.id === id)?.qty || 0;
  }

  function setQty(id: string, qty: number) {
    setCart((current) => {
      const rest = current.filter((line) => line.id !== id);
      if (qty <= 0) return rest;
      const previous = current.find((line) => line.id === id);
      return [...rest, { id, qty: Math.min(20, qty), note: previous?.note || "" }];
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
          customerName: name,
          tableOrAddress: table,
          note,
          items: cart.map((line) => ({ id: line.id, qty: line.qty, note: line.note }))
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not place the order");
      setCart([]);
      setOpen(false);
      if (json.url) window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="store-page" style={themeStyle}>
      <div className="store-wrap">
        <div className="tap-lang">
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
            {text("english")}
          </button>
          <button type="button" aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>
            {text("hindi")}
          </button>
        </div>
        <p className="store-kicker">
          <Link href={`/${channel}/${code}`}>{businessName}</Link>
        </p>
        <h1>{lang === "hi" ? "आज का मेनू" : "Today's menu"}</h1>
        <input className="store-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text("search")} aria-label={text("search")} />
        <div className="store-chips">
          <button type="button" aria-pressed={categoryId === "all"} onClick={() => setCategoryId("all")}>
            {lang === "hi" ? "सभी" : "All"}
          </button>
          {categories.map((category) => (
            <button key={category.id} type="button" aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
              {label(category)}
            </button>
          ))}
        </div>
        {visible.length === 0 ? <p>{text("emptyMenu")}</p> : null}
        <div className="store-grid">
          {visible.map((item) => {
            const qty = qtyOf(item.id);
            const photo = safeImageSrc(item.photo);
            return (
              <article key={item.id} className="store-card">
                <div className="store-photo">
                  {photo ? <img src={photo} alt="" /> : <span>{item.name.slice(0, 1)}</span>}
                  {item.veg !== "NONE" ? <span className="store-pill" data-veg={item.veg}>{item.veg === "NON_VEG" ? "Non-veg" : item.veg === "EGG" ? "Egg" : "Veg"}</span> : null}
                </div>
                <h2 className="store-name">{label(item)}</h2>
                <div className="store-price">{formatRupees(item.pricePaise)}</div>
                {qty === 0 ? (
                  <button type="button" className="store-add" onClick={() => setQty(item.id, 1)}>
                    {text("add")}
                  </button>
                ) : (
                  <div className="store-step">
                    <button type="button" aria-label="Decrease" onClick={() => setQty(item.id, qty - 1)}>−</button>
                    <span style={{ alignSelf: "center", textAlign: "center" }}>{qty}</span>
                    <button type="button" aria-label="Increase" onClick={() => setQty(item.id, qty + 1)}>+</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
      {count > 0 ? (
        <button type="button" className="store-bag" aria-label={text("bag")} onClick={() => setOpen(true)}>
          {count}
        </button>
      ) : null}
      {count > 0 ? (
        <button type="button" className="store-bar" onClick={() => setOpen(true)}>
          <span>{count}</span>
          <span>{formatRupees(total)}</span>
          <span>{text("yourOrder")}</span>
        </button>
      ) : null}
      {open ? (
        <div className="store-sheet" role="dialog" aria-label={text("yourOrder")}>
          <button type="button" className="store-add" onClick={() => setOpen(false)}>
            {text("closeBag")}
          </button>
          <h2>{text("yourOrder")}</h2>
          {cart.map((line) => {
            const item = items.find((row) => row.id === line.id);
            if (!item) return null;
            return (
              <div key={line.id} className="store-card">
                <strong>{label(item)}</strong>
                <span>{line.qty} · {formatRupees(item.pricePaise * line.qty)}</span>
                <input
                  aria-label={text("note")}
                  value={line.note}
                  placeholder={text("note")}
                  onChange={(event) =>
                    setCart((current) => current.map((row) => (row.id === line.id ? { ...row, note: event.target.value } : row)))
                  }
                />
              </div>
            );
          })}
          <input aria-label={text("customerName")} value={name} placeholder={text("customerName")} onChange={(event) => setName(event.target.value)} />
          <input aria-label={text("table")} value={table} placeholder={text("table")} onChange={(event) => setTable(event.target.value)} />
          <textarea aria-label={text("note")} value={note} placeholder={text("note")} onChange={(event) => setNote(event.target.value)} />
          <p className="store-privacy">
            {text("privacyOrder")} <Link href="/privacy">{lang === "hi" ? "गोपनीयता" : "Privacy"}</Link>
          </p>
          {error ? <p className="store-privacy">{error}</p> : null}
          <button type="button" className="store-order" disabled={busy || count === 0} onClick={placeOrder}>
            {text("orderWhatsApp")} · {formatRupees(total)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
