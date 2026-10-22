export type ShopVariant = {
  sku: string;
  name: string;
  nameHi: string | null;
  salePaise: number;
  mrpPaise: number;
  gstPercent: number;
  stock: number;
  minQty: number;
  ships: boolean;
  weightGrams: number;
  imageUrl: string | null;
  includedLifetime: boolean;
};

export type ShopProduct = {
  slug: string;
  name: string;
  nameHi: string | null;
  description: string;
  descriptionHi: string | null;
  needsNfc: boolean;
  needsDesign: boolean;
  defaultTemplateId: string | null;
  fromPaise: number;
  mrpPaise: number;
  ships: boolean;
  imageUrl: string | null;
  variants: ShopVariant[];
};
