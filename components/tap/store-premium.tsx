"use client";

import * as React from "react";
import { Home, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import { tapText, type TapLang } from "@/lib/tap/i18n";
import { formatRupees } from "@/lib/tap/order-message";
import { safeImageSrc } from "@/lib/tap/links";
import { askOnWhatsApp, type StoreView } from "@/lib/store/layout";
import {
  categoryInitials,
  dealClock,
  percentOff,
  recentItems,
  showFlash,
  type DesignBanner,
  type DesignCoupon
} from "@/lib/store/design";
import { storeDesignFontClass } from "@/components/brand/store-font";
import { FoodRows } from "./food-rows";
import type { StoreCategory, StoreItem } from "./store-menu";
import styles from "./store-designs.module.css";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function Countdown({ endsAt, text }: { endsAt: string; text: (key: Parameters<typeof tapText>[1]) => string }) {
  const [left, setLeft] = React.useState<number | null>(null);
  React.useEffect(() => {
    const tick = () => setLeft(new Date(endsAt).getTime() - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  if (left == null) return <span className={styles.clock}>--:--:--</span>;
  if (left <= 0) return null;
  const total = Math.floor(left / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return (
    <span className={styles.clock}>
      <b>{pad(hours)}<small>{text("hoursShort")}</small></b>
      <b>{pad(minutes)}<small>{text("minutes")}</small></b>
      <b>{pad(seconds)}<small>{text("secondsShort")}</small></b>
    </span>
  );
}

function useScheme(enabled: boolean) {
  const [choice, setChoice] = React.useState<"light" | "dark" | "system">("system");
  const [systemDark, setSystemDark] = React.useState(false);
  React.useEffect(() => {
    if (!enabled) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const saved = window.localStorage.getItem("rq-store-scheme");
    if (saved === "light" || saved === "dark") setChoice(saved);
    const apply = () => setSystemDark(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [enabled]);
  const dark = choice === "dark" || (choice === "system" && systemDark);
  function toggle() {
    const next = dark ? "light" : "dark";
    setChoice(next);
    window.localStorage.setItem("rq-store-scheme", next);
  }
  return { scheme: choice === "system" ? undefined : choice, toggle, dark };
}

type Look = "premium" | "minimal" | "bold";

function StoreLook({
  look,
  code,
  businessName,
  logoUrl,
  layout,
  lang,
  setLang,
  query,
  setQuery,
  vegOnly,
  setVegOnly,
  categories,
  items,
  sections,
  banners,
  coupons,
  label,
  text,
  count,
  qtyOf,
  onChange,
  onOpenCart,
  askBase,
  preview = false,
  accentStyle
}: {
  code: string;
  businessName: string;
  logoUrl: string;
  layout: StoreView;
  lang: TapLang;
  setLang: (lang: TapLang) => void;
  query: string;
  setQuery: (value: string) => void;
  vegOnly: boolean;
  setVegOnly: (value: boolean) => void;
  categories: StoreCategory[];
  items: StoreItem[];
  sections: { id: string; title: string; items: StoreItem[] }[];
  banners: DesignBanner[];
  coupons: DesignCoupon[];
  label: (item: { name: string; nameHi: string }) => string;
  text: (key: Parameters<typeof tapText>[1]) => string;
  count: number;
  qtyOf: (id: string) => number;
  onChange: (item: StoreItem, delta: number) => void;
  onOpenCart: () => void;
  askBase: string;
  look: Look;
  preview?: boolean;
  accentStyle?: React.CSSProperties;
}) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const schemeOn = look !== "minimal" && !preview;
  const { scheme, toggle, dark } = useScheme(schemeOn);
  const root = look === "minimal" ? styles.minimal : look === "bold" ? styles.bold : styles.premium;
  const shownScheme = preview ? (look === "bold" ? "dark" : look === "premium" ? "light" : undefined) : schemeOn ? scheme : undefined;
  const [rows, setRows] = React.useState(false);
  const [categoryId, setCategoryId] = React.useState("");
  const [lastOrder, setLastOrder] = React.useState("");
  const clock = dealClock(banners, coupons, new Date());
  const logo = safeImageSrc(logoUrl);
  const hero = banners[0];
  const promos = banners.slice(1, 3);
  const shown = categoryId ? items.filter((item) => item.categoryId === categoryId) : items;
  const flash = showFlash(items, clock);
  const recent = recentItems(items);
  const searchLabel = layout === "SHOP" ? text("searchProducts") : layout === "SERVICES" ? text("searchServices") : text("search");

  React.useEffect(() => {
    if (preview) return;
    setLastOrder(window.localStorage.getItem(`rq-last-order:${code}`) || "");
  }, [code, preview]);

  function scrollTo(id: string) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className={styles.frame} style={accentStyle}>
    <div className={`${root} ${storeDesignFontClass}`} data-scheme={shownScheme} data-lang={lang}>
      <header className={styles.top}>
        {logo ? <img className={styles.logo} src={logo} alt="" /> : <span className={styles.initial}>{categoryInitials(businessName)}</span>}
        <label className={styles.search}>
          <Search aria-hidden="true" />
          <input ref={searchRef} value={query} aria-label={searchLabel} placeholder={searchLabel} onChange={(event) => setQuery(event.target.value)} />
        </label>
        {schemeOn ? (
          <button type="button" className={styles.iconBtn} aria-pressed={dark} onClick={toggle}>
            {dark ? text("lightMode") : text("darkMode")}
          </button>
        ) : null}
        <button type="button" className={styles.cartBtn} onClick={onOpenCart} aria-label={text("cart")}>
          <ShoppingBag aria-hidden="true" />
          {count > 0 ? <span className={styles.badge}>{count}</span> : null}
        </button>
      </header>
      <div className={styles.tools}>
        <div role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
          <button type="button" aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">हिं</button>
        </div>
        {layout === "FOOD" ? (
          <button type="button" aria-pressed={vegOnly} onClick={() => setVegOnly(!vegOnly)}>{text("vegOnly")}</button>
        ) : null}
        {layout === "FOOD" ? (
          <button type="button" aria-pressed={rows} onClick={() => setRows((value) => !value)}>
            {rows ? text("cardsView") : text("compactRows")}
          </button>
        ) : null}
      </div>
      <div className={styles.cats} id="sd-categories">
        {categories.map((category) => {
          const photo = safeImageSrc(items.find((item) => item.categoryId === category.id && item.photo)?.photo || "");
          const name = label(category);
          return (
            <button key={category.id} type="button" className={styles.cat} aria-pressed={categoryId === category.id} onClick={() => { setCategoryId(category.id); scrollTo("sd-products"); }}>
              {photo ? <img src={photo} alt="" loading="lazy" /> : <i>{categoryInitials(name)}</i>}
              {name}
            </button>
          );
        })}
      </div>
      {hero ? (
        <section className={styles.hero}>
          <p className={styles.kicker}>{businessName}</p>
          <h2>{hero.title}</h2>
          {hero.body ? <p>{hero.body}</p> : null}
        </section>
      ) : (
        <section className={styles.hero}>
          <h2>{businessName}</h2>
        </section>
      )}
      {promos.length > 0 ? (
        <div className={styles.promos}>
          {promos.map((banner) => (
            <article key={banner.id} className={styles.promo}>
              <h3>{banner.title}</h3>
              {banner.body ? <p className={styles.muted}>{banner.body}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
      {clock ? (
        <article className={styles.deal}>
          <p className={styles.kicker}>{text("dealOfDay")}</p>
          <h3>{clock.title}</h3>
          {clock.detail ? <p className={styles.muted}>{clock.detail}</p> : null}
          <Countdown endsAt={clock.expiresAt} text={text} />
        </article>
      ) : null}
      {flash.length > 0 ? (
        <section className={styles.band}>
          <h2>{text("flashSale")}</h2>
          {clock ? <div style={{ padding: "0 1rem" }}><Countdown endsAt={clock.expiresAt} text={text} /></div> : null}
          <div className={styles.scroller}>
            {flash.map((item, index) => (
              <ProductCard key={item.id} item={item} label={label} text={text} layout={layout} askBase={askBase} eager={index === 0} onAdd={() => onChange(item, 1)} />
            ))}
          </div>
        </section>
      ) : null}
      <section className={styles.band} id="sd-products">
        {shown.length === 0 ? <p className={styles.empty}>{layout === "SERVICES" ? text("noServices") : layout === "SHOP" ? text("noProducts") : text("noMatch")}</p> : null}
        {layout === "FOOD" && rows ? (
          <div className={styles.rows}>
            <FoodRows sections={sections} label={label} text={text} qtyOf={qtyOf} onChange={onChange} />
          </div>
        ) : (
          <div className={layout === "SERVICES" ? styles.stack : styles.grid}>
            {shown.map((item, index) => (
              <ProductCard key={item.id} item={item} label={label} text={text} layout={layout} askBase={askBase} eager={index === 0} onAdd={() => onChange(item, 1)} />
            ))}
          </div>
        )}
      </section>
      {recent.length > 0 ? (
        <section className={styles.band}>
          <h2>{text("recentlyAdded")}</h2>
          <div className={styles.scroller}>
            {recent.map((item) => (
              <ProductCard key={item.id} item={item} label={label} text={text} layout={layout} askBase={askBase} onAdd={() => onChange(item, 1)} />
            ))}
          </div>
        </section>
      ) : null}
      {look === "minimal" ? null : (
      <nav className={styles.dock} aria-label={text("home")}>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>
          <Home aria-hidden="true" size={18} />
          {text("home")}
        </button>
        <button type="button" onClick={() => scrollTo("sd-categories")}>
          <LayoutGrid aria-hidden="true" size={18} />
          {text("categories")}
        </button>
        <button type="button" className={styles.dockCart} onClick={onOpenCart} aria-label={text("cart")}>
          <ShoppingBag aria-hidden="true" size={20} />
          {count > 0 ? <span className={styles.badge}>{count}</span> : null}
        </button>
        {lastOrder.startsWith("/o/") ? (
          <a href={lastOrder}>{text("orders")}</a>
        ) : (
          <button type="button" disabled aria-label={text("noOrderYet")}>{text("orders")}</button>
        )}
        <button type="button" onClick={() => searchRef.current?.focus()}>
          <Search aria-hidden="true" size={18} />
          {text("searchNav")}
        </button>
      </nav>
      )}
    </div>
    </div>
  );
}

type LookProps = Omit<React.ComponentProps<typeof StoreLook>, "look">;

export function PremiumStore(props: LookProps) {
  return <StoreLook look="premium" {...props} />;
}

export function MinimalStore(props: LookProps) {
  return <StoreLook look="minimal" {...props} />;
}

export function BoldStore(props: LookProps) {
  return <StoreLook look="bold" {...props} />;
}

function ProductCard({
  item,
  label,
  text,
  layout,
  askBase,
  eager,
  onAdd
}: {
  item: StoreItem;
  label: (item: { name: string; nameHi: string }) => string;
  text: (key: Parameters<typeof tapText>[1]) => string;
  layout: StoreView;
  askBase: string;
  eager?: boolean;
  onAdd: () => void;
}) {
  const photo = safeImageSrc(item.photo);
  const off = percentOff(item.pricePaise, item.mrpPaise);
  const name = label(item);
  const ask = layout === "SERVICES" ? askOnWhatsApp(askBase, name) : "";
  return (
    <article className={styles.card}>
      {photo ? <img src={photo} alt="" loading={eager ? "eager" : "lazy"} /> : <div className={styles.photoFall}>{categoryInitials(name)}</div>}
      {off > 0 ? <span className={styles.off}>{off}% {text("offSuffix")}</span> : null}
      {layout === "FOOD" && item.veg !== "NONE" ? <span className={styles.veg}>{item.veg === "VEG" ? "Veg" : item.veg === "EGG" ? "Egg" : "Non-veg"}</span> : null}
      <div className={styles.body}>
        <h3>{name}</h3>
        {layout === "SHOP" && item.brand ? <p className={styles.muted}>{item.brand}</p> : null}
        {layout === "SERVICES" && item.durationMinutes ? <p className={styles.muted}>{item.durationMinutes} {text("minutes")}</p> : null}
        <p className={styles.price}>
          {formatRupees(item.pricePaise)}
          {off > 0 && item.mrpPaise ? <s>{formatRupees(item.mrpPaise)}</s> : null}
        </p>
        <button type="button" className={styles.add} onClick={onAdd}>
          {layout === "SERVICES" ? text("book") : text("add")}
        </button>
        {ask ? <a href={ask}>{text("enquire")}</a> : null}
      </div>
    </article>
  );
}
