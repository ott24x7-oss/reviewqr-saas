import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { getAiConfig } from "@/lib/settings";
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
    include: { items: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } }
  });
  const [loose, ai] = await Promise.all([
    prisma.menuItem.findMany({
      where: { businessId: access.id, categoryId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    getAiConfig().catch(() => null)
  ]);
  return (
    <MenuEditor
      businessId={access.id}
      businessName={access.name}
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
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
  available: boolean;
}) {
  return {
    id: item.id,
    name: item.name,
    nameHi: item.nameHi || "",
    priceRupees: item.pricePaise / 100,
    veg: item.veg,
    available: item.available
  };
}
