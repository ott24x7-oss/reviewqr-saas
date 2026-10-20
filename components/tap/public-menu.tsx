import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { tapFontClass } from "@/components/brand/tap-font";
import { isLookupCode } from "@/lib/tap/ids";
import { loadPublicTap } from "@/lib/tap/resolve";
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
  const [categories, loose, extra] = await Promise.all([
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
    readAdminThemes().catch(() => [])
  ]);
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
        "--store-ink": theme.tokens.ink
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
  photo: string | null;
  veg: StoreItem["veg"];
}): StoreItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    nameHi: item.nameHi || "",
    pricePaise: item.pricePaise,
    photo: item.photo,
    veg: item.veg
  };
}
