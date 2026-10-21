import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { getAiConfig } from "@/lib/settings";
import { resolveLayout, type StoreView } from "@/lib/store/layout";
import { MenuEditor } from "./menu-editor";

export const dynamic = "force-dynamic";

export default async function BusinessMenuPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await requireBusinessRole(user.id, params.id, "read");
  if (!access) notFound();
  const categories = await prisma.menuCategory.findMany({
    where: { businessId: access.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          variants: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
          addOns: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }
        }
      }
    }
  });
  const [loose, ai, settings] = await Promise.all([
    prisma.menuItem.findMany({
      where: { businessId: access.id, categoryId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        variants: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
        addOns: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }
      }
    }),
    getAiConfig().catch(() => null),
    prisma.storeSettings.findUnique({ where: { businessId: access.id }, select: { layout: true } })
  ]);
  const layout: StoreView = resolveLayout(settings?.layout, access.industry);
  return (
    <MenuEditor
      businessId={access.id}
      businessName={access.name}
      layout={layout}
      aiReady={!!(ai?.enabled && ai.apiKey)}
      canEdit={access.accessRole !== "STAFF"}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        nameHi: category.nameHi || "",
        items: category.items.map(serialize)
      }))}
      loose={loose.map(serialize)}
    />
  );
}

function serialize(item: {
  id: string;
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
  barcode: string;
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
  available: boolean;
  variants: {
    id: string;
    label: string;
    labelHi: string | null;
    size: string;
    colour: string;
    pricePaise: number;
    inStock: boolean;
  }[];
  addOns: {
    id: string;
    name: string;
    nameHi: string | null;
    pricePaise: number;
    inStock: boolean;
  }[];
}) {
  return {
    id: item.id,
    name: item.name,
    nameHi: item.nameHi || "",
    priceRupees: item.pricePaise / 100,
    mrpRupees: item.mrpPaise == null ? null : item.mrpPaise / 100,
    description: item.description || "",
    bestseller: item.bestseller,
    photo: item.photo,
    photos: item.photos || [],
    brand: item.brand || "",
    durationMinutes: item.durationMinutes,
    barcode: item.barcode || "",
    veg: item.veg,
    available: item.available,
    variants: item.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      labelHi: variant.labelHi || "",
      size: variant.size,
      colour: variant.colour,
      priceRupees: variant.pricePaise / 100,
      inStock: variant.inStock
    })),
    addOns: item.addOns.map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      nameHi: addOn.nameHi || "",
      priceRupees: addOn.pricePaise / 100,
      inStock: addOn.inStock
    }))
  };
}
