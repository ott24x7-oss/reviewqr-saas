import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { tapFontClass } from "@/components/brand/tap-font";
import { isLookupCode } from "@/lib/tap/ids";
import { hoursFromPublished } from "@/lib/tap/links";
import { loadPublicTap } from "@/lib/tap/resolve";
import { isOrderForLater, rulesFromSettings } from "@/lib/store/pricing";
import { readAdminThemes } from "@/lib/tap/theme-store";
import { FREE_THEME_ID, THEME_PRESETS, resolveTheme, tokensToStyle } from "@/lib/tap/themes";
import { PublicTap } from "./public-page";
import { StoreMenu, type StoreItem } from "./store-menu";

export async function PublicMenu({ code, channel }: { code: string; channel: "q" | "t" }) {
  if (!isLookupCode(code)) notFound();
  const record = await loadPublicTap(code);
  if (record.status !== "active") {
    return <PublicTap code={code} channel={channel} countScan={false} />;
  }
  const [categories, loose, extra, settings, qr] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { businessId: record.businessId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          where: { available: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
        }
      }
    }),
    prisma.menuItem.findMany({
      where: { businessId: record.businessId, available: true, categoryId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    readAdminThemes().catch(() => []),
    prisma.storeSettings.findUnique({ where: { businessId: record.businessId } }),
    prisma.qRCode.findUnique({ where: { shortCode: record.shortCode }, select: { label: true } })
  ]);
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
        tableLabel={qr?.label || ""}
        themeStyle={themeStyle as CSSProperties | undefined}
      />
    </div>
  );
}

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
  veg: StoreItem["veg"];
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
    veg: item.veg
  };
}
