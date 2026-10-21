"use client";

import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { ShopLangToggle, useShopLang } from "./lang";
import type { ShopProduct } from "./types";

function offPercent(mrp: number, sale: number) {
  if (mrp <= sale) return 0;
  return Math.round(((mrp - sale) / mrp) * 100);
}

export function ShopGrid({ products }: { products: ShopProduct[] }) {
  const { lang, choose, copy } = useShopLang();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{copy.shop}</h1>
          <p className="text-sm text-muted-ink">{copy.priceNote}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/shop/orders" className="text-sm font-semibold text-ink">{copy.orders}</Link>
          <Link href="/dashboard/shop/cart" className="text-sm font-semibold text-ink">{copy.cart}</Link>
          <ShopLangToggle lang={lang} choose={choose} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {products.map((product) => {
          const off = offPercent(product.mrpPaise, product.fromPaise);
          const name = lang === "hi" && product.nameHi ? product.nameHi : product.name;
          return (
            <Link key={product.slug} href={`/dashboard/shop/${product.slug}`} className="rounded-[20px] bg-white p-4 text-ink shadow-sm">
              <h2 className="text-lg font-semibold">{name}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-ink">{lang === "hi" && product.descriptionHi ? product.descriptionHi : product.description}</p>
              <p className="mt-3 text-base font-semibold">
                {formatINR(product.fromPaise)}
                {off > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-ink line-through">
                    {copy.mrp} {formatINR(product.mrpPaise)}
                  </span>
                )}
                {off > 0 && <span className="ml-2 text-sm text-emerald-700">{off}% {copy.off}</span>}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
