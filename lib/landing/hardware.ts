import { prisma } from "../db";

export type StandAddon = {
  slug: string;
  name: string;
  nameHi: string;
  imageUrl: string;
  salePaise: number;
  mrpPaise: number | null;
  needsNfc: boolean;
};

/** Physical QR / NFC stands from the shop catalogue. Digital plan SKUs are left out. */
export async function listStandAddons(): Promise<StandAddon[]> {
  const products = await prisma.catalogProduct.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      variants: {
        where: { active: true, includedTier: null },
        orderBy: { salePaise: "asc" }
      }
    }
  });

  return products.flatMap((product) => {
    const variant = product.variants.find((item) => item.weightGrams > 0 || product.needsNfc);
    if (!variant || variant.salePaise <= 0) return [];
    return [
      {
        slug: product.slug,
        name: product.name,
        nameHi: product.nameHi || product.name,
        imageUrl: variant.imageUrl || "",
        salePaise: variant.salePaise,
        mrpPaise: variant.mrpPaise > variant.salePaise ? variant.mrpPaise : null,
        needsNfc: product.needsNfc
      }
    ];
  });
}
