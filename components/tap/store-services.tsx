"use client";

import { tapText } from "@/lib/tap/i18n";
import { formatRupees } from "@/lib/tap/order-message";
import { askOnWhatsApp } from "@/lib/store/layout";
import type { StoreItem } from "./store-menu";

export function ServicesCatalog({
  items,
  label,
  text,
  onBook,
  askBase
}: {
  items: StoreItem[];
  label: (item: { name: string; nameHi: string }) => string;
  text: (key: Parameters<typeof tapText>[1]) => string;
  onBook: (item: StoreItem) => void;
  askBase: string;
}) {
  if (items.length === 0) return <p className="store-empty">{text("noServices")}</p>;
  return (
    <div>
      {items.map((item) => {
        const ask = askOnWhatsApp(askBase, label(item));
        return (
          <div key={item.id} className="store-service">
            <div>
              <h3 className="store-name">{label(item)}</h3>
              <p className="store-price">
                {item.durationMinutes ? `${item.durationMinutes} ${text("minutes")} · ` : ""}
                {formatRupees(item.pricePaise)}
              </p>
              {item.description ? <p className="store-desc">{item.description}</p> : null}
            </div>
            <div className="store-service-actions">
              <button type="button" onClick={() => onBook(item)}>{text("book")}</button>
              {ask ? (
                <a href={ask} target="_blank" rel="noopener noreferrer">{text("enquire")}</a>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
