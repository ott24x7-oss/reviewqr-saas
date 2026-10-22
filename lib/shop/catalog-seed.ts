import type { CatalogProductInput, CatalogVariantInput } from "./catalog";

export type CatalogSeed = {
  product: CatalogProductInput;
  variants: CatalogVariantInput[];
};

const box = (lengthMm: number, widthMm: number, heightMm: number) => ({ lengthMm, widthMm, heightMm });

function variant(
  sku: string,
  name: string,
  nameHi: string,
  prices: { cost: number; mrp: number; sale: number },
  shipping: { weightGrams: number; lengthMm: number; widthMm: number; heightMm: number },
  extra?: Partial<CatalogVariantInput>
): CatalogVariantInput {
  return {
    sku,
    name,
    nameHi,
    costPaise: prices.cost,
    mrpPaise: prices.mrp,
    salePaise: prices.sale,
    hsn: "49119990",
    gstPercent: 18,
    stock: 100,
    lowStockAt: 10,
    minQty: 1,
    ...shipping,
    ...extra
  };
}

/** Built-in hardware. Admins can edit these rows after they are seeded. */
export const CATALOG_SEED: CatalogSeed[] = [
  {
    product: {
      slug: "qr-stand",
      name: "QR table stand",
      nameHi: "क्यूआर टेबल स्टैंड",
      description: "A printed table stand with your QR. Custom print, so it is made after you approve the proof.",
      descriptionHi: "आपके क्यूआर वाला प्रिंटेड टेबल स्टैंड। प्रूफ मंजूर होने के बाद छपाई होती है।",
      needsNfc: false,
      needsDesign: true,
      defaultTemplateId: "standee-4x6",
      sortOrder: 10
    },
    variants: [
      variant("STAND-QR", "QR table stand", "क्यूआर टेबल स्टैंड", { cost: 25000, mrp: 99900, sale: 79900 }, { weightGrams: 300, ...box(150, 120, 40) })
    ]
  },
  {
    product: {
      slug: "nfc-qr-combo",
      name: "NFC + QR combo",
      nameHi: "एनएफसी और क्यूआर कॉम्बो",
      description: "A table stand with a QR and an NFC card programmed to the same tap page.",
      descriptionHi: "टेबल स्टैंड पर क्यूआर और उसी टैप पेज के लिए एनएफसी कार्ड।",
      needsNfc: true,
      needsDesign: true,
      defaultTemplateId: "standee-4x6",
      sortOrder: 20
    },
    variants: [
      variant(
        "COMBO-NFC-QR",
        "NFC + QR combo",
        "एनएफसी और क्यूआर कॉम्बो",
        { cost: 45000, mrp: 199900, sale: 149900 },
        { weightGrams: 350, ...box(160, 120, 50) },
        { hsn: "85235210" }
      )
    ]
  },
  {
    product: {
      slug: "pvc-nfc-card",
      name: "PVC NFC card",
      nameHi: "पीवीसी एनएफसी कार्ड",
      description: "A CR80 card with your design and an NFC chip.",
      descriptionHi: "आपके डिज़ाइन और एनएफसी चिप वाला सीआर80 कार्ड।",
      needsNfc: true,
      needsDesign: true,
      defaultTemplateId: "cr80",
      sortOrder: 30
    },
    variants: [
      variant(
        "CARD-PVC-NFC",
        "PVC NFC card",
        "पीवीसी एनएफसी कार्ड",
        { cost: 12000, mrp: 69900, sale: 49900 },
        { weightGrams: 20, ...box(100, 70, 5) },
        { hsn: "85235210" }
      )
    ]
  },
  {
    product: {
      slug: "table-stickers",
      name: "Table stickers",
      nameHi: "टेबल स्टिकर",
      description: "A pack of printed table stickers with your QR.",
      descriptionHi: "आपके क्यूआर वाले प्रिंटेड टेबल स्टिकर का पैक।",
      needsNfc: false,
      needsDesign: true,
      defaultTemplateId: "square-60",
      sortOrder: 40
    },
    variants: [
      variant("STICK-5", "Pack of 5", "5 का पैक", { cost: 8000, mrp: 39900, sale: 29900 }, { weightGrams: 40, ...box(120, 120, 10) }),
      variant("STICK-10", "Pack of 10", "10 का पैक", { cost: 14000, mrp: 69900, sale: 49900 }, { weightGrams: 70, ...box(120, 120, 15) })
    ]
  },
  {
    product: {
      slug: "keychain-tag",
      name: "Keychain tag",
      nameHi: "कीचेन टैग",
      description: "A small NFC keychain tag with your QR.",
      descriptionHi: "आपके क्यूआर वाला छोटा एनएफसी कीचेन टैग।",
      needsNfc: true,
      needsDesign: true,
      defaultTemplateId: "keychain",
      sortOrder: 50
    },
    variants: [
      variant(
        "KEY-NFC",
        "Keychain tag",
        "कीचेन टैग",
        { cost: 15000, mrp: 59900, sale: 39900 },
        { weightGrams: 25, ...box(80, 50, 15) },
        { hsn: "85235210" }
      )
    ]
  }
];

export const CATALOG_SKUS = ["STAND-QR", "COMBO-NFC-QR", "CARD-PVC-NFC", "STICK-5", "STICK-10", "KEY-NFC"];

/** Lifetime plan. Stock is the cap. Seeded with Prisma, never by the enum migration. */
export const FOUNDER_SKU = "FOUNDER-LIFE";
export const FOUNDER_CAP = 100;
export const FOUNDER_SALE_PAISE = 2499900;

export const FOUNDER_SEED: CatalogSeed = {
  product: {
    slug: "founder-lifetime",
    name: "Founder lifetime",
    nameHi: "फाउंडर लाइफटाइम",
    description: "A limited lifetime plan with Growth limits. It is not printed and it does not ship.",
    descriptionHi: "ग्रोथ सीमाओं वाला सीमित लाइफटाइम प्लान। यह छपता नहीं और भेजा नहीं जाता।",
    needsNfc: false,
    needsDesign: false,
    defaultTemplateId: null,
    sortOrder: 90
  },
  variants: [
    variant(
      FOUNDER_SKU,
      "Founder lifetime",
      "फाउंडर लाइफटाइम",
      { cost: 0, mrp: 2999900, sale: FOUNDER_SALE_PAISE },
      { weightGrams: 0, ...box(0, 0, 0) },
      {
        hsn: "998313",
        ships: false,
        stock: FOUNDER_CAP,
        includedTier: "FOUNDER",
        includedLifetime: true,
        includedMonths: null
      }
    )
  ]
};
