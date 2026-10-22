"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { artKind, cartUnits, hasOptions, offPercent } from "@/lib/shop/card";
import { formatINR } from "@/lib/utils";
import { ShopLangToggle, useShopLang } from "./lang";
import { ProductArt } from "./product-art";
import type { ShopProduct, ShopVariant } from "./types";

type Copy = ReturnType<typeof useShopLang>["copy"];
type AddState = "idle" | "adding" | "added";

async function addToCart(sku: string, qty: number, copy: Copy) {
  const response = await fetch("/api/v1/shop/cart/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sku, qty })
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: { lines?: Array<{ qty: number }> }; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || copy.addFailed);
  return cartUnits(payload.data?.lines ?? []);
}

/** Runs one add and flips the button to "Added" for a moment. */
function useAdd(copy: Copy, onCount: (count: number) => void) {
  const [state, setState] = React.useState<AddState>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  React.useEffect(() => () => clearTimeout(timer.current), []);
  async function run(sku: string, qty: number) {
    if (state === "adding") return;
    setState("adding");
    try {
      onCount(await addToCart(sku, qty, copy));
      setState("added");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 2200);
    } catch (error) {
      setState("idle");
      toast.error(error instanceof Error ? error.message : copy.addFailed);
    }
  }
  return { state, run };
}

function productName(product: ShopProduct, lang: string) {
  return lang === "hi" && product.nameHi ? product.nameHi : product.name;
}

function variantName(variant: ShopVariant, lang: string) {
  return lang === "hi" && variant.nameHi ? variant.nameHi : variant.name;
}

function ProductImage({ product, businessName, copy, src }: { product: ShopProduct; businessName: string; copy: Copy; src?: string | null }) {
  const url = src ?? product.imageUrl;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- uploads may be data URLs or any storage host
    return <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />;
  }
  return (
    <ProductArt
      kind={artKind(product)}
      businessName={businessName}
      words={{ tagline: copy.artTagline, lifetime: copy.artLifetime }}
      className="absolute inset-0 h-full w-full"
    />
  );
}

function Price({ sale, mrp, copy }: { sale: number; mrp: number; copy: Copy }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-base font-bold text-ink">{formatINR(sale)}</span>
      {mrp > sale && (
        <span className="text-xs text-muted-ink line-through">
          <span className="sr-only">{copy.mrp} </span>
          {formatINR(mrp)}
        </span>
      )}
    </p>
  );
}

function CtaLabel({ state, idle, copy }: { state: AddState; idle: string; copy: Copy }) {
  if (state === "adding") return <>{copy.adding}</>;
  if (state === "added") {
    return (
      <span className="shop-pop inline-flex items-center gap-1.5">
        <Check className="h-4 w-4" aria-hidden="true" />
        {copy.added}
      </span>
    );
  }
  return <>{idle}</>;
}

const CTA =
  "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-70";
const CTA_SOLID = "bg-ink text-background hover:bg-ink/90";
const CTA_DONE = "bg-emerald-700 text-white";

function ProductCard({
  product,
  businessName,
  lang,
  copy,
  onCount,
  onChoose
}: {
  product: ShopProduct;
  businessName: string;
  lang: string;
  copy: Copy;
  onCount: (count: number) => void;
  onChoose: (product: ShopProduct) => void;
}) {
  const { state, run } = useAdd(copy, onCount);
  const off = offPercent(product.mrpPaise, product.fromPaise);
  const name = productName(product, lang);
  const first = product.variants[0];
  const href = `/dashboard/shop/${product.slug}`;
  const tag = !product.ships ? copy.plan : product.needsNfc ? copy.nfcBadge : null;

  return (
    <article aria-label={name} className="group flex flex-col overflow-hidden rounded-[20px] bg-card text-ink shadow-sm ring-1 ring-border/60">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-secondary" tabIndex={-1} aria-hidden="true">
        <span className="absolute inset-0 transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03]">
          <ProductImage product={product} businessName={businessName} copy={copy} />
        </span>
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-background">
            {off}% {copy.off}
          </span>
        )}
        {tag && <span className="absolute right-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-ink">{tag}</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <Link href={href} className="line-clamp-2 text-sm font-semibold leading-snug hover:underline sm:text-base">
          {name}
        </Link>
        <Price sale={product.fromPaise} mrp={product.mrpPaise} copy={copy} />
        <div className="mt-auto pt-1">
          {hasOptions(product) ? (
            <button type="button" className={`${CTA} border border-ink bg-card text-ink hover:bg-secondary`} onClick={() => onChoose(product)}>
              {copy.choose}
            </button>
          ) : (
            <button
              type="button"
              disabled={!first || state === "adding"}
              className={`${CTA} ${state === "added" ? CTA_DONE : CTA_SOLID}`}
              onClick={() => first && void run(first.sku, Math.max(1, first.minQty))}
            >
              <CtaLabel state={state} idle={copy.add} copy={copy} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ChooseSheet({
  product,
  businessName,
  lang,
  copy,
  onClose,
  onCount
}: {
  product: ShopProduct | null;
  businessName: string;
  lang: string;
  copy: Copy;
  onClose: () => void;
  onCount: (count: number) => void;
}) {
  const [sku, setSku] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const { state, run } = useAdd(copy, onCount);
  const variant = product?.variants.find((item) => item.sku === sku) ?? product?.variants[0];

  React.useEffect(() => {
    const start = product?.variants[0];
    setSku(start?.sku ?? "");
    setQty(Math.max(1, start?.minQty ?? 1));
  }, [product]);

  function pick(next: ShopVariant) {
    setSku(next.sku);
    setQty((current) => Math.max(current, next.minQty, 1));
  }

  const min = Math.max(1, variant?.minQty ?? 1);
  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-4 bg-card text-ink">
        {product && variant && (
          <>
            <div className="flex gap-3 pr-6">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                <ProductImage product={product} businessName={businessName} copy={copy} src={variant.imageUrl ?? product.imageUrl} />
              </div>
              <div className="min-w-0 space-y-1 text-left">
                <DialogTitle className="text-lg font-semibold leading-tight">{productName(product, lang)}</DialogTitle>
                <Price sale={variant.salePaise} mrp={variant.mrpPaise} copy={copy} />
                <DialogDescription className="text-xs text-muted-ink">{copy.priceNote}</DialogDescription>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold" id="choose-option">{copy.chooseOption}</p>
              <div className="grid gap-2" role="radiogroup" aria-labelledby="choose-option">
                {product.variants.map((item) => {
                  const selected = item.sku === variant.sku;
                  const off = offPercent(item.mrpPaise, item.salePaise);
                  return (
                    <button
                      key={item.sku}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => pick(item)}
                      className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-4 py-2 text-left text-sm transition-colors duration-150 ${selected ? "border-ink bg-secondary" : "border-border hover:bg-secondary/60"}`}
                    >
                      <span className="font-medium">{variantName(item, lang)}</span>
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-semibold">{formatINR(item.salePaise)}</span>
                        {off > 0 && <span className="text-xs text-muted-ink">{off}% {copy.off}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold" id="choose-qty">
                {copy.qty}
                {min > 1 && <span className="ml-1 font-normal text-muted-ink">({copy.minQty} {min})</span>}
              </span>
              <div className="inline-flex items-center rounded-full border border-border" role="group" aria-labelledby="choose-qty">
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40" aria-label="−" disabled={qty <= min} onClick={() => setQty((value) => Math.max(min, value - 1))}>
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="min-w-8 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full" aria-label="+" onClick={() => setQty((value) => Math.min(999, value + 1))}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            {product.needsDesign && <p className="text-xs text-muted-ink">{copy.designInCart}</p>}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                disabled={state === "adding"}
                className={`${CTA} ${state === "added" ? CTA_DONE : CTA_SOLID}`}
                onClick={() => void run(variant.sku, qty)}
              >
                <CtaLabel state={state} idle={`${copy.add} · ${formatINR(variant.salePaise * qty)}`} copy={copy} />
              </button>
              {state === "added" && (
                <Link href="/dashboard/shop/cart" className={`${CTA} border border-ink px-5 text-ink hover:bg-secondary sm:w-auto`}>
                  {copy.viewCart}
                </Link>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ShopGrid({
  products,
  showCommission = false,
  cartCount = 0,
  businessName = null
}: {
  products: ShopProduct[];
  showCommission?: boolean;
  cartCount?: number;
  businessName?: string | null;
}) {
  const { lang, choose, copy } = useShopLang();
  const [count, setCount] = React.useState(cartCount);
  const [bump, setBump] = React.useState(0);
  const [choosing, setChoosing] = React.useState<ShopProduct | null>(null);
  const previewName = businessName || copy.yourBusiness;

  function onCount(next: number) {
    setCount(next);
    setBump((value) => value + 1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{copy.shop}</h1>
          <p className="text-sm text-muted-ink">{copy.priceNote}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/shop/orders" className="text-sm font-semibold text-ink">{copy.orders}</Link>
          {showCommission ? (
            <Link href="/dashboard/shop/commission" className="text-sm font-semibold text-ink">{copy.commission}</Link>
          ) : null}
          <ShopLangToggle lang={lang} choose={choose} />
          <Link
            href="/dashboard/shop/cart"
            aria-label={`${copy.cart}, ${count} ${copy.items}`}
            data-testid="shop-cart-link"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-background"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {copy.cart}
            <span
              key={bump}
              data-testid="shop-cart-count"
              className={`${bump ? "shop-pop " : ""}inline-flex min-w-6 items-center justify-center rounded-full bg-background px-1.5 text-xs font-bold tabular-nums text-ink`}
            >
              {count}
            </span>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} businessName={previewName} lang={lang} copy={copy} onCount={onCount} onChoose={setChoosing} />
        ))}
      </div>
      <ChooseSheet product={choosing} businessName={previewName} lang={lang} copy={copy} onClose={() => setChoosing(null)} onCount={onCount} />
    </div>
  );
}
