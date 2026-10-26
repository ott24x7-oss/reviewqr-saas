import { CAFE_TEMPLATE } from "../tap/cafe-template";

export type TemplateItem = {
  name: string;
  nameHi: string;
  pricePaise: number;
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
  description?: string;
  bestseller?: boolean;
  brand?: string;
  durationMinutes?: number;
  priceType?: "FIXED" | "FROM" | "ON_REQUEST";
};

export type TemplateGroup = {
  category: string;
  categoryHi: string;
  items: TemplateItem[];
};

export const SERVICE_TEMPLATE_IDS = ["salon", "spa", "clinic", "gym", "tutor"] as const;

export type StoreTemplateId =
  | "cafe"
  | "restaurant"
  | "mobile"
  | "clothing"
  | "kirana"
  | (typeof SERVICE_TEMPLATE_IDS)[number];

export type StoreTemplate = {
  id: StoreTemplateId;
  name: string;
  groups: TemplateGroup[];
};

export function isServiceTemplate(id: string | undefined): id is (typeof SERVICE_TEMPLATE_IDS)[number] {
  return SERVICE_TEMPLATE_IDS.includes(id as (typeof SERVICE_TEMPLATE_IDS)[number]);
}

const restaurant: TemplateGroup[] = [
  {
    category: "Starters",
    categoryHi: "स्टार्टर",
    items: [
      { name: "Veg pakora", nameHi: "वेज पकोड़ा", pricePaise: 9000, veg: "VEG" },
      { name: "Tomato soup", nameHi: "टमाटर सूप", pricePaise: 8000, veg: "VEG" }
    ]
  },
  {
    category: "Mains",
    categoryHi: "मेन",
    items: [
      { name: "Dal tadka", nameHi: "दाल तड़का", pricePaise: 18000, veg: "VEG", bestseller: true },
      { name: "Paneer butter masala", nameHi: "पनीर बटर मसाला", pricePaise: 26000, veg: "VEG" },
      { name: "Chicken curry", nameHi: "चिकन करी", pricePaise: 28000, veg: "NON_VEG" }
    ]
  },
  {
    category: "Breads",
    categoryHi: "रोटी",
    items: [
      { name: "Tawa roti", nameHi: "तवा रोटी", pricePaise: 2000, veg: "VEG" },
      { name: "Butter naan", nameHi: "बटर नान", pricePaise: 4000, veg: "VEG" }
    ]
  }
];

const mobile: TemplateGroup[] = [
  {
    category: "Phones",
    categoryHi: "फ़ोन",
    items: [
      { name: "Basic phone", nameHi: "बेसिक फ़ोन", pricePaise: 149900, veg: "NONE", brand: "Generic" },
      { name: "Smartphone", nameHi: "स्मार्टफ़ोन", pricePaise: 899900, veg: "NONE", brand: "Generic" }
    ]
  },
  {
    category: "Accessories",
    categoryHi: "एक्सेसरीज़",
    items: [
      { name: "Earphones", nameHi: "ईयरफ़ोन", pricePaise: 39900, veg: "NONE" },
      { name: "Charging cable", nameHi: "चार्जिंग केबल", pricePaise: 19900, veg: "NONE" },
      { name: "Back cover", nameHi: "बैक कवर", pricePaise: 24900, veg: "NONE" }
    ]
  }
];

const clothing: TemplateGroup[] = [
  {
    category: "Tops",
    categoryHi: "टॉप",
    items: [
      { name: "Cotton t-shirt", nameHi: "कॉटन टी-शर्ट", pricePaise: 49900, veg: "NONE", brand: "House" },
      { name: "Formal shirt", nameHi: "फॉर्मल शर्ट", pricePaise: 89900, veg: "NONE", brand: "House" }
    ]
  },
  {
    category: "Bottoms",
    categoryHi: "बॉटम",
    items: [
      { name: "Jeans", nameHi: "जींस", pricePaise: 129900, veg: "NONE" },
      { name: "Cotton trousers", nameHi: "कॉटन ट्राउज़र", pricePaise: 99900, veg: "NONE" }
    ]
  }
];

const kirana: TemplateGroup[] = [
  {
    category: "Staples",
    categoryHi: "राशन",
    items: [
      { name: "Rice 1 kg", nameHi: "चावल 1 किलो", pricePaise: 6000, veg: "VEG" },
      { name: "Atta 1 kg", nameHi: "आटा 1 किलो", pricePaise: 5000, veg: "VEG" },
      { name: "Sugar 1 kg", nameHi: "चीनी 1 किलो", pricePaise: 4500, veg: "VEG" }
    ]
  },
  {
    category: "Household",
    categoryHi: "घर",
    items: [
      { name: "Bathing soap", nameHi: "साबुन", pricePaise: 4000, veg: "NONE" },
      { name: "Biscuits", nameHi: "बिस्कुट", pricePaise: 3000, veg: "VEG" }
    ]
  }
];

const salon: TemplateGroup[] = [
  {
    category: "Hair",
    categoryHi: "बाल",
    items: [
      { name: "Haircut", nameHi: "हेयरकट", pricePaise: 20000, veg: "NONE", durationMinutes: 30 },
      { name: "Hair colour", nameHi: "हेयर कलर", pricePaise: 80000, veg: "NONE", durationMinutes: 60, priceType: "FROM" }
    ]
  },
  {
    category: "Skin",
    categoryHi: "स्किन",
    items: [
      { name: "Cleanup", nameHi: "क्लीनअप", pricePaise: 50000, veg: "NONE", durationMinutes: 45 },
      { name: "Manicure", nameHi: "मैनीक्योर", pricePaise: 40000, veg: "NONE", durationMinutes: 40 }
    ]
  }
];

const spa: TemplateGroup[] = [
  {
    category: "Massage",
    categoryHi: "मसाज",
    items: [
      { name: "Swedish massage", nameHi: "स्वीडिश मसाज", pricePaise: 150000, veg: "NONE", durationMinutes: 60 },
      { name: "Head massage", nameHi: "हेड मसाज", pricePaise: 40000, veg: "NONE", durationMinutes: 30 }
    ]
  },
  {
    category: "Skin",
    categoryHi: "स्किन",
    items: [
      { name: "Facial", nameHi: "फेशियल", pricePaise: 80000, veg: "NONE", durationMinutes: 45, priceType: "FROM" }
    ]
  }
];

const clinic: TemplateGroup[] = [
  {
    category: "Visits",
    categoryHi: "विज़िट",
    items: [
      { name: "Consultation", nameHi: "परामर्श", pricePaise: 30000, veg: "NONE", durationMinutes: 15 },
      { name: "Follow-up", nameHi: "फॉलो-अप", pricePaise: 20000, veg: "NONE", durationMinutes: 15 },
      { name: "Home visit", nameHi: "घर पर विज़िट", pricePaise: 0, veg: "NONE", durationMinutes: 30, priceType: "ON_REQUEST" }
    ]
  }
];

const gym: TemplateGroup[] = [
  {
    category: "Training",
    categoryHi: "ट्रेनिंग",
    items: [
      { name: "Personal training", nameHi: "पर्सनल ट्रेनिंग", pricePaise: 50000, veg: "NONE", durationMinutes: 60 },
      { name: "Yoga class", nameHi: "योग क्लास", pricePaise: 30000, veg: "NONE", durationMinutes: 45 }
    ]
  }
];

const tutor: TemplateGroup[] = [
  {
    category: "Classes",
    categoryHi: "क्लास",
    items: [
      { name: "Maths class", nameHi: "गणित क्लास", pricePaise: 40000, veg: "NONE", durationMinutes: 60 },
      { name: "English class", nameHi: "अंग्रेज़ी क्लास", pricePaise: 40000, veg: "NONE", durationMinutes: 60, priceType: "FROM" }
    ]
  }
];

export const STORE_TEMPLATES: StoreTemplate[] = [
  { id: "cafe", name: "Café", groups: CAFE_TEMPLATE },
  { id: "restaurant", name: "Restaurant", groups: restaurant },
  { id: "mobile", name: "Mobile shop", groups: mobile },
  { id: "clothing", name: "Clothing", groups: clothing },
  { id: "kirana", name: "Kirana", groups: kirana },
  { id: "salon", name: "Salon", groups: salon },
  { id: "spa", name: "Spa", groups: spa },
  { id: "clinic", name: "Clinic", groups: clinic },
  { id: "gym", name: "Gym", groups: gym },
  { id: "tutor", name: "Tutor", groups: tutor }
];

export function templateById(id: string | undefined) {
  return STORE_TEMPLATES.find((template) => template.id === id) || STORE_TEMPLATES[0];
}

export function flattenTemplate(template: StoreTemplate) {
  const rows: { category: string; categoryHi: string; item: TemplateItem }[] = [];
  for (const group of template.groups) {
    for (const item of group.items) rows.push({ category: group.category, categoryHi: group.categoryHi, item });
  }
  return rows;
}
