import { Minus, Plus, Star } from "lucide-react";
import { tapText } from "@/lib/tap/i18n";
import { formatRupees } from "@/lib/tap/order-message";
import { safeImageSrc } from "@/lib/tap/links";
import type { StoreItem } from "./store-menu";

type Section = { id: string; title: string; items: StoreItem[] };

function soldOut(item: StoreItem) {
  return item.variants.length > 0 && !item.variants.some((row) => row.inStock);
}

function rowPrice(item: StoreItem) {
  const stocked = item.variants.filter((row) => row.inStock);
  if (!stocked.length) return { paise: item.pricePaise, from: false };
  const min = Math.min(...stocked.map((row) => row.pricePaise));
  return { paise: min, from: stocked.some((row) => row.pricePaise !== min) };
}

function VegMark({ kind }: { kind: StoreItem["veg"] }) {
  const tone = kind === "VEG" ? "veg" : kind === "EGG" ? "egg" : "nonveg";
  const name = kind === "VEG" ? "Veg" : kind === "EGG" ? "Egg" : "Non-veg";
  return (
    <span className="store-mark" data-tone={tone} role="img" aria-label={name}>
      <span />
    </span>
  );
}

/** Compact food rows shared by Classic and the design "Rows" control. */
export function FoodRows({
  sections,
  label,
  text,
  qtyOf,
  onChange
}: {
  sections: Section[];
  label: (item: { name: string; nameHi: string }) => string;
  text: (key: Parameters<typeof tapText>[1]) => string;
  qtyOf: (id: string) => number;
  onChange: (item: StoreItem, delta: number) => void;
}) {
  return (
    <>
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
                            {Math.round(((item.mrpPaise - item.pricePaise) / item.mrpPaise) * 100)}% {text("offSuffix")}
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
                      <button type="button" className="store-add" onClick={() => onChange(item, 1)} aria-label={`${text("add")} ${label(item)}`}>
                        {text("add").toUpperCase()}
                        <Plus aria-hidden="true" />
                      </button>
                    ) : (
                      <div className="store-step" role="group" aria-label={label(item)}>
                        <button type="button" aria-label="Decrease" onClick={() => onChange(item, -1)}>
                          <Minus aria-hidden="true" />
                        </button>
                        <span aria-live="polite">{qty}</span>
                        <button type="button" aria-label="Increase" onClick={() => onChange(item, 1)}>
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
  );
}
