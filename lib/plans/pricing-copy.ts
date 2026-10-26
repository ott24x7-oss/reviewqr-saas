import { z } from "zod";
import { prisma } from "../db";

/** One public question. Empty storage falls back to the copy that shipped with the page. */
export type PricingFaq = { qEn: string; qHi: string; aEn: string; aHi: string };

/** One row of the sticker-versus-QR24x7 table. */
export type StickerRow = { labelEn: string; labelHi: string; sticker: boolean; qr24x7: boolean };

export type PricingCopy = { faqs: PricingFaq[]; stickerRows: StickerRow[] };

export const PRICING_COPY_KEY = "pricing.copy";

export const DEFAULT_PRICING_FAQS: PricingFaq[] = [
  {
    qEn: "What is NFC? Do my customers need an app?",
    qHi: "NFC क्या है? क्या ग्राहकों को ऐप चाहिए?",
    aEn: "NFC is the same tap technology used for contactless payments. Most modern phones open your page when tapped on the stand — no app needed. Phones without NFC simply scan the QR code with the camera.",
    aHi: "NFC वही टैप तकनीक है जो कॉन्टैक्टलेस पेमेंट में चलती है। ज़्यादातर नए फ़ोन स्टैंड पर टैप करते ही पेज खोल देते हैं — ऐप की ज़रूरत नहीं। बिना NFC वाले फ़ोन कैमरे से QR स्कैन कर लेते हैं।"
  },
  {
    qEn: "Can I change my links after the stand is printed?",
    qHi: "क्या स्टैंड छपने के बाद लिंक बदल सकता हूँ?",
    aEn: "Yes. The QR and NFC point to your QR24x7 page, so you can change your menu, links, offers or theme any time from your dashboard. The printed stand stays the same.",
    aHi: "हाँ। QR और NFC आपके QR24x7 पेज पर जाते हैं, इसलिए मेनू, लिंक, ऑफ़र या थीम कभी भी डैशबोर्ड से बदल सकते हैं। छपा स्टैंड वही रहता है।"
  },
  {
    qEn: "How does WhatsApp ordering work?",
    qHi: "WhatsApp ऑर्डर कैसे काम करता है?",
    aEn: "Customers add items to the cart and tap “Order on WhatsApp”. A neatly formatted order with items, total, table or address and a UPI payment link opens in WhatsApp, addressed to your number. You get the order instantly — with no commission.",
    aHi: "ग्राहक कार्ट में आइटम डालकर “Order on WhatsApp” दबाते हैं। आइटम, कुल, टेबल या पता और UPI लिंक के साथ ऑर्डर आपके नंबर पर WhatsApp में खुलता है। ऑर्डर तुरंत मिलता है — कमीशन नहीं।"
  },
  {
    qEn: "Is this allowed by Google?",
    qHi: "क्या यह Google को मंज़ूर है?",
    aEn: "Every customer sees the public Google or Trustpilot link and a private note on the same screen, whatever the star rating. AI only tidies words the customer already wrote. They edit and copy it, and nothing is posted for them. Rewards, coupons, and stamps are never offered in exchange for a public review.",
    aHi: "हर ग्राहक को एक ही स्क्रीन पर सार्वजनिक Google या Trustpilot लिंक और एक निजी नोट दिखता है, चाहे स्टार कुछ भी हों। AI सिर्फ़ वे शब्द सँवारता है जो ग्राहक ने लिखे। वे खुद एडिट करके कॉपी करते हैं, और कुछ उनके लिए पोस्ट नहीं होता। पब्लिक रिव्यू के बदले रिवॉर्ड, कूपन या स्टैम्प नहीं दिए जाते।"
  },
  {
    qEn: "Do you deliver the stands? How long does it take?",
    qHi: "क्या स्टैंड डिलीवर होता है? कितने दिन लगते हैं?",
    aEn: "Yes, pan-India with tracking. You approve the design first; we then print, program the NFC and ship — usually within a few working days, depending on your pincode.",
    aHi: "हाँ, ट्रैकिंग के साथ पूरे भारत में। पहले आप डिज़ाइन मंज़ूर करते हैं; फिर हम प्रिंट करते हैं, NFC प्रोग्राम करते हैं और भेजते हैं — आमतौर पर कुछ काम के दिनों में, पिनकोड के हिसाब से।"
  },
  {
    qEn: "Can I manage multiple branches?",
    qHi: "क्या कई शाखाएँ संभाल सकता हूँ?",
    aEn: "Yes. Each branch, table or staff member can have its own QR/NFC, and you see everything in one dashboard.",
    aHi: "हाँ। हर शाखा, टेबल या स्टाफ का अपना QR/NFC हो सकता है, और सब एक डैशबोर्ड में दिखता है।"
  },
  {
    qEn: "How do I pay?",
    qHi: "पेमेंट कैसे करें?",
    aEn: "Pay in INR by UPI — no card needed.",
    aHi: "INR में UPI से भुगतान करें — कार्ड की ज़रूरत नहीं।"
  },
  {
    qEn: "Is my data safe?",
    qHi: "क्या मेरा डेटा सुरक्षित है?",
    aEn: "Passwords are hashed, forms are rate-limited and protected, and we never sell your or your customers' data. You can export your data any time.",
    aHi: "पासवर्ड हैश होते हैं, फ़ॉर्म रेट-लिमिट और सुरक्षित हैं, और हम आपका या ग्राहकों का डेटा नहीं बेचते। डेटा कभी भी एक्सपोर्ट कर सकते हैं।"
  },
  {
    qEn: "Can I pick a different duration?",
    qHi: "क्या मैं अलग अवधि चुन सकता हूँ?",
    aEn: "Yes. Choose 1 month, 6 months, 1 year, or lifetime. Checkout uses the price saved on that plan.",
    aHi: "हाँ। 1 महीना, 6 महीने, 1 साल या लाइफटाइम चुनें। चेकआउट उसी प्लान की सेव की हुई कीमत लेता है।"
  },
  {
    qEn: "Do you take a commission on WhatsApp orders?",
    qHi: "क्या WhatsApp ऑर्डर पर कमीशन लगता है?",
    aEn: "No. Orders go to your own WhatsApp number.",
    aHi: "नहीं। ऑर्डर आपके अपने WhatsApp नंबर पर जाते हैं।"
  },
  {
    qEn: "Do I have to buy a stand?",
    qHi: "क्या स्टैंड खरीदना ज़रूरी है?",
    aEn: "No. You can download the QR. A printed QR + NFC stand is optional from the shop.",
    aHi: "नहीं। QR डाउनलोड कर सकते हैं। प्रिंटेड QR + NFC स्टैंड दुकान से वैकल्पिक है।"
  }
];

export const DEFAULT_STICKER_ROWS: StickerRow[] = [
  { labelEn: "Google review link", labelHi: "Google रिव्यू लिंक", sticker: true, qr24x7: true },
  { labelEn: "Change links after printing", labelHi: "छपाई के बाद लिंक बदलें", sticker: false, qr24x7: true },
  { labelEn: "NFC tap (no camera needed)", labelHi: "NFC टैप (कैमरा नहीं चाहिए)", sticker: false, qr24x7: true },
  { labelEn: "Menu + WhatsApp ordering", labelHi: "मेनू + WhatsApp ऑर्डर", sticker: false, qr24x7: true },
  { labelEn: "Private feedback alerts", labelHi: "निजी फ़ीडबैक अलर्ट", sticker: false, qr24x7: true },
  { labelEn: "Customer list & loyalty", labelHi: "ग्राहक सूची और लॉयल्टी", sticker: false, qr24x7: true },
  { labelEn: "Scans, orders & review reports", labelHi: "स्कैन, ऑर्डर और रिव्यू रिपोर्ट", sticker: false, qr24x7: true },
  { labelEn: "Themes with your branding", labelHi: "आपकी ब्रांडिंग वाली थीम", sticker: false, qr24x7: true }
];

const faqSchema = z.object({
  qEn: z.string().trim().min(1).max(300),
  qHi: z.string().trim().min(1).max(300),
  aEn: z.string().trim().min(1).max(2000),
  aHi: z.string().trim().min(1).max(2000)
});

const stickerSchema = z.object({
  labelEn: z.string().trim().min(1).max(160),
  labelHi: z.string().trim().min(1).max(160),
  sticker: z.boolean(),
  qr24x7: z.boolean()
});

const copySchema = z.object({
  faqs: z.array(faqSchema).min(1).max(40),
  stickerRows: z.array(stickerSchema).min(1).max(40)
});

export function defaultPricingCopy(): PricingCopy {
  return {
    faqs: DEFAULT_PRICING_FAQS.map((item) => ({ ...item })),
    stickerRows: DEFAULT_STICKER_ROWS.map((item) => ({ ...item }))
  };
}

/** Saved copy when it is valid. Otherwise the shipped questions and sticker rows. */
export function pricingCopyFromUnknown(value: unknown): PricingCopy {
  const parsed = copySchema.safeParse(value);
  return parsed.success ? parsed.data : defaultPricingCopy();
}

export async function getPricingCopy(): Promise<PricingCopy> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: PRICING_COPY_KEY } });
    if (!row) return defaultPricingCopy();
    return pricingCopyFromUnknown(JSON.parse(row.value));
  } catch {
    return defaultPricingCopy();
  }
}

export async function setPricingCopy(value: unknown, updatedBy?: string) {
  const parsed = copySchema.safeParse(value);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "Invalid pricing copy" };
  const json = JSON.stringify(parsed.data);
  await prisma.appSetting.upsert({
    where: { key: PRICING_COPY_KEY },
    create: { key: PRICING_COPY_KEY, value: json, updatedBy: updatedBy || null },
    update: { value: json, updatedBy: updatedBy || null }
  });
  return { ok: true as const, copy: parsed.data };
}
