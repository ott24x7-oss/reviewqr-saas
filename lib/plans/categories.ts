export const PLAN_CATEGORIES = [
  { id: "reviews", en: "Review QR", hi: "रिव्यू QR", image: "product-reviews" },
  { id: "menu", en: "Menu + QR", hi: "मेनू + QR", image: "product-menu" },
  { id: "store", en: "WhatsApp Store", hi: "व्हाट्सऐप स्टोर", image: "product-store" },
  { id: "profile", en: "Profile / Link page", hi: "प्रोफ़ाइल / लिंक पेज", image: "product-profile" },
  { id: "combo", en: "Combos", hi: "कॉम्बो", image: "product-combo" }
] as const;

export type PlanCategory = (typeof PLAN_CATEGORIES)[number]["id"];

export function isPlanCategory(value: string): value is PlanCategory {
  return PLAN_CATEGORIES.some((item) => item.id === value);
}

export function planCategory(value: string): PlanCategory {
  return isPlanCategory(value) ? value : "reviews";
}

const TICKS: Record<PlanCategory, Array<{ en: string; hi: string }>> = {
  reviews: [
    { en: "Google review QR + NFC", hi: "Google रिव्यू QR + NFC" },
    { en: "Private feedback", hi: "निजी फ़ीडबैक" },
    { en: "Hindi and English page", hi: "हिन्दी और अंग्रेज़ी पेज" }
  ],
  menu: [
    { en: "Menu on the tap page", hi: "टैप पेज पर मेनू" },
    { en: "QR + NFC stand page", hi: "QR + NFC स्टैंड पेज" },
    { en: "No commission", hi: "कोई कमीशन नहीं" }
  ],
  store: [
    { en: "WhatsApp ordering page", hi: "WhatsApp ऑर्डर पेज" },
    { en: "Cart and order list", hi: "कार्ट और ऑर्डर सूची" },
    { en: "No commission", hi: "कोई कमीशन नहीं" }
  ],
  profile: [
    { en: "One page for every link", hi: "हर लिंक के लिए एक पेज" },
    { en: "QR + NFC to open it", hi: "खोलने के लिए QR + NFC" },
    { en: "Hindi and English", hi: "हिन्दी और अंग्रेज़ी" }
  ],
  combo: [
    { en: "Reviews, menu, and orders", hi: "रिव्यू, मेनू और ऑर्डर" },
    { en: "One QR + NFC stand", hi: "एक QR + NFC स्टैंड" },
    { en: "GST invoice included", hi: "GST इनवॉइस शामिल" }
  ]
};

const AUDIENCE: Record<PlanCategory, Array<{ en: string; hi: string }>> = {
  reviews: [
    { en: "Café", hi: "कैफ़े" },
    { en: "Salon", hi: "सैलून" },
    { en: "Shop", hi: "दुकान" },
    { en: "Clinic", hi: "क्लिनिक" }
  ],
  menu: [
    { en: "Café", hi: "कैफ़े" },
    { en: "Salon", hi: "सैलून" },
    { en: "Restaurant", hi: "रेस्टोरेंट" }
  ],
  store: [
    { en: "Café", hi: "कैफ़े" },
    { en: "Clothing shop", hi: "कपड़े की दुकान" },
    { en: "Kirana", hi: "किराना" }
  ],
  profile: [
    { en: "Salon", hi: "सैलून" },
    { en: "Clinic", hi: "क्लिनिक" },
    { en: "Shop", hi: "दुकान" }
  ],
  combo: [
    { en: "Café", hi: "कैफ़े" },
    { en: "Restaurant", hi: "रेस्टोरेंट" },
    { en: "Shop", hi: "दुकान" }
  ]
};

export function planTicks(category: string) {
  return TICKS[planCategory(category)];
}

export function planAudience(category: string) {
  return AUDIENCE[planCategory(category)];
}

export function fallbackImageName(category: string) {
  return PLAN_CATEGORIES.find((item) => item.id === planCategory(category))!.image;
}

export function buyHref(slug: string, duration: string) {
  return `/register?plan=${encodeURIComponent(slug)}&duration=${encodeURIComponent(duration)}`;
}

export const DURATION_CHIPS = {
  MONTH_1: { en: "1M", hi: "1म" },
  MONTH_6: { en: "6M", hi: "6म" },
  YEAR_1: { en: "1Y", hi: "1सा" },
  LIFETIME: { en: "Lifetime", hi: "लाइफ" }
} as const;
