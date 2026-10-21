"use client";

import * as React from "react";
import { BookOpen, ChevronLeft, Minus, Plus, Search, ShoppingBag, Star, X } from "lucide-react";
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
  mrpPaise: number | null;
  description: string;
  bestseller: boolean;
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
  const [vegOnly, setVegOnly] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
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
    if (vegOnly && item.veg !== "VEG") return false;
    if (!query.trim()) return true;
    const hay = `${item.name} ${item.nameHi} ${item.description}`.toLowerCase();
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

  return (
    <div className="store-page" style={themeStyle}>
      <div className="store-wrap">
        <header className="store-head">
          <div className="store-head-row">
            <Link className="store-back" href={`/${channel}/${code}`} aria-label={businessName}>
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
          <p className="store-sub">{lang === "hi" ? "WhatsApp पर ऑर्डर करें · कोई कमीशन नहीं" : "Order on WhatsApp · 0% commission"}</p>
          <div className="store-tools">
            <label className="store-search-wrap">
              <Search aria-hidden="true" />
              <input
                className="store-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text("search")}
                aria-label={text("search")}
              />
            </label>
            <button
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
            </button>
          </div>
        </header>

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
                        {formatRupees(item.pricePaise)}
                        {item.mrpPaise && item.mrpPaise > item.pricePaise ? (
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
                      {qty === 0 ? (
                        <button type="button" className="store-add" onClick={() => setQty(item.id, 1)} aria-label={`${text("add")} ${label(item)}`}>
                          {text("add").toUpperCase()}
                          <Plus aria-hidden="true" />
                        </button>
                      ) : (
                        <div className="store-step" role="group" aria-label={label(item)}>
                          <button type="button" aria-label="Decrease" onClick={() => setQty(item.id, qty - 1)}>
                            <Minus aria-hidden="true" />
                          </button>
                          <span aria-live="polite">{qty}</span>
                          <button type="button" aria-label="Increase" onClick={() => setQty(item.id, qty + 1)}>
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
      </div>

      {sections.length > 1 ? (
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

      {count > 0 ? (
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
            return (
              <div key={line.id} className="store-line">
                <div className="store-line-top">
                  <strong className="store-line-name">{label(item)}</strong>
                  <span className="store-line-price">{formatRupees(item.pricePaise * line.qty)}</span>
                </div>
                <div className="store-step store-step-sm">
                  <button type="button" aria-label="Decrease" onClick={() => setQty(item.id, line.qty - 1)}>−</button>
                  <span style={{ alignSelf: "center", textAlign: "center" }}>{line.qty}</span>
                  <button type="button" aria-label="Increase" onClick={() => setQty(item.id, line.qty + 1)}>+</button>
                </div>
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
          <div className="store-total">
            <span>{text("total")}</span>
            <strong>{formatRupees(total)}</strong>
          </div>
          <input aria-label={text("customerName")} value={name} placeholder={text("customerName")} onChange={(event) => setName(event.target.value)} />
          <input aria-label={text("table")} value={table} placeholder={text("table")} onChange={(event) => setTable(event.target.value)} />
          <textarea aria-label={text("note")} value={note} placeholder={text("note")} onChange={(event) => setNote(event.target.value)} />
          <p className="store-privacy">
            {text("privacyOrder")} <Link href="/privacy">{text("privacyLink")}</Link>
          </p>
          {error ? <p className="store-privacy">{error}</p> : null}
          <button type="button" className="store-order" disabled={busy || count === 0} onClick={placeOrder}>
            {text("orderWhatsApp")} · {formatRupees(total)}
          </button>
        </div>
        </>
      ) : null}
    </div>
  );
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
