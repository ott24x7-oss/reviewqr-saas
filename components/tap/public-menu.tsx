import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { tapFontClass } from "@/components/brand/tap-font";
import { isLookupCode } from "@/lib/tap/ids";
import { hoursFromPublished, whatsAppNumberUrl } from "@/lib/tap/links";
import { loadPublicTap } from "@/lib/tap/resolve";
import { isOrderForLater, rulesFromSettings } from "@/lib/store/pricing";
import { normalizeUpiId } from "@/lib/store/upi";
import { resolveLayout } from "@/lib/store/layout";
import { resolveDesign } from "@/lib/store/design";
import { readAdminThemes } from "@/lib/tap/theme-store";
import { FREE_THEME_ID, THEME_PRESETS, resolveTheme, tokensToStyle } from "@/lib/tap/themes";
import { publicCatalogue } from "@/lib/store/public-catalogue";
import { PublicTap } from "./public-page";
import { StoreMenu, type StoreItem } from "./store-menu";

export async function PublicMenu({
  code,
  channel,
  homeHref,
  hideTable,
  view = "menu"
}: {
  code: string;
  channel: "q" | "t";
  homeHref?: string;
  hideTable?: boolean;
  view?: "menu" | "services";
}) {
  if (!isLookupCode(code)) notFound();
  const record = await loadPublicTap(code);
  if (record.status !== "active") {
    return <PublicTap code={code} channel={channel} countScan={false} />;
  }
  const [categories, loose, extra, settings, qr, banners, coupons, profile] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { businessId: record.businessId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          where: { available: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: optionInclude
        }
      }
    }),
    prisma.menuItem.findMany({
      where: { businessId: record.businessId, available: true, categoryId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: optionInclude
    }),
    readAdminThemes().catch(() => []),
    prisma.storeSettings.findUnique({ where: { businessId: record.businessId } }),
    prisma.qRCode.findUnique({ where: { shortCode: record.shortCode }, select: { label: true } }),
    prisma.offerBanner.findMany({
      where: {
        businessId: record.businessId,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, body: true, expiresAt: true }
    }),
    prisma.coupon.findMany({
      where: {
        businessId: record.businessId,
        active: true,
        expiresAt: { gt: new Date() }
      },
      select: { id: true, code: true, kind: true, amount: true, expiresAt: true, active: true }
    }),
    prisma.business.findUnique({
      where: { id: record.businessId },
      select: { industry: true, logo: true, ownerId: true, catalogMode: true }
    })
  ]);
  const catalogue = profile ? await publicCatalogue(profile.ownerId) : null;
  const showCatalogue = !!catalogue?.showCatalogue;
  const canOrder = !!catalogue?.canOrder;
  const canBookServices = !!catalogue?.canBookServices;
  if (!showCatalogue) {
    return <PublicTap code={code} channel={channel} countScan={false} />;
  }
  const rules = rulesFromSettings(settings, hoursFromPublished(record.business.published));
  const items: StoreItem[] = [
    ...categories.flatMap((category) => category.items.map(toItem)),
    ...loose.map(toItem)
  ];
  const theme = resolveTheme({ published: record.business.published, paid: record.paid, extra });
  const stock = THEME_PRESETS.find((item) => item.id === FREE_THEME_ID)?.tokens || THEME_PRESETS[0].tokens;
  const themed = theme.id !== FREE_THEME_ID || theme.tokens.bg !== stock.bg || theme.tokens.ink !== stock.ink;
  const themeStyle = themed
    ? {
        ...tokensToStyle(theme.tokens),
        "--store-bg": theme.tokens.bg,
        "--store-bg-2": theme.tokens.bg,
        "--store-card": theme.tokens.bg,
        "--store-ink": theme.tokens.ink,
        "--store-muted": theme.tokens.muted,
        "--store-cta": theme.tokens.buttonBg,
        "--store-cta-ink": theme.tokens.buttonInk
      }
    : undefined;

  return (
    <div className={tapFontClass}>
      <StoreMenu
        code={code}
        channel={channel}
        businessName={record.business.name}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          nameHi: category.nameHi || ""
        }))}
        items={items}
        rules={rules}
        closed={isOrderForLater(rules)}
        tableLabel={hideTable ? "" : qr?.label || ""}
        banners={
          canOrder
            ? banners.map((banner) => ({
                id: banner.id,
                title: banner.title,
                body: banner.body,
                expiresAt: banner.expiresAt ? banner.expiresAt.toISOString() : null
              }))
            : []
        }
        coupons={
          canOrder
            ? coupons.map((coupon) => ({
                id: coupon.id,
                code: coupon.code,
                kind: coupon.kind,
                amount: coupon.amount,
                active: coupon.active,
                expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null
              }))
            : []
        }
        upiId={normalizeUpiId(settings?.upiId || "") || ""}
        themeStyle={themeStyle as CSSProperties | undefined}
        layout={resolveLayout(settings?.layout, profile?.industry)}
        design={resolveDesign(settings?.design)}
        logoUrl={profile?.logo || ""}
        homeHref={homeHref}
        canOrder={canOrder}
        canBookServices={canBookServices}
        askBase={whatsAppNumberUrl(record.business.whatsappNumber) || ""}
        catalogMode={profile?.catalogMode || "MENU"}
        initialView={view}
      />
    </div>
  );
}

const optionInclude = {
  variants: { orderBy: [{ sortOrder: "asc" as const }, { label: "asc" as const }] },
  addOns: { orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }] }
};

function toItem(item: {
  id: string;
  categoryId: string | null;
  name: string;
  nameHi: string | null;
  pricePaise: number;
  mrpPaise: number | null;
  description: string | null;
  bestseller: boolean;
  photo: string | null;
  photos: string[];
  brand: string;
  durationMinutes: number | null;
  kind: StoreItem["kind"];
  priceType: StoreItem["priceType"];
  bookable: boolean;
  createdAt: Date;
  veg: StoreItem["veg"];
  variants: {
    id: string;
    label: string;
    labelHi: string | null;
    size: string;
    colour: string;
    pricePaise: number;
    inStock: boolean;
    durationMinutes: number | null;
  }[];
  addOns: {
    id: string;
    name: string;
    nameHi: string | null;
    pricePaise: number;
    inStock: boolean;
  }[];
}): StoreItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    nameHi: item.nameHi || "",
    pricePaise: item.pricePaise,
    mrpPaise: item.mrpPaise,
    description: item.description || "",
    bestseller: item.bestseller,
    photo: item.photo,
    photos: item.photos || [],
    brand: item.brand || "",
    durationMinutes: item.durationMinutes,
    kind: item.kind,
    priceType: item.priceType,
    bookable: item.bookable,
    createdAt: item.createdAt.toISOString(),
    veg: item.veg,
    variants: item.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      labelHi: variant.labelHi || "",
      size: variant.size,
      colour: variant.colour,
      pricePaise: variant.pricePaise,
      inStock: variant.inStock,
      durationMinutes: variant.durationMinutes
    })),
    addOns: item.addOns.map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      nameHi: addOn.nameHi || "",
      pricePaise: addOn.pricePaise,
      inStock: addOn.inStock
    }))
  };
}
