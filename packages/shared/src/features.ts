/**
 * Owner features and the catalogue module that unlocks each one.
 * Module ids match lib/plans/catalog.ts MODULES. A plan stores those ids.
 * Free and trial tiers include every module, so this list does not lock them.
 */
export const FEATURE_MODULE_IDS = ["REVIEWS", "MENU", "STORE"] as const;

export type FeatureModuleId = (typeof FEATURE_MODULE_IDS)[number];

export const FEATURES = [
  {
    id: "menu",
    module: "MENU",
    labelEn: "Menu",
    labelHi: "मेनू",
    doesEn: ["Show dishes and services on your page", "Group them in categories", "Read a menu photo into items"],
    doesHi: ["पेज पर व्यंजन और सेवाएँ दिखाएँ", "उन्हें श्रेणियों में रखें", "मेनू की फोटो से आइटम पढ़ें"]
  },
  {
    id: "services-booking",
    module: "MENU",
    labelEn: "Service booking",
    labelHi: "सेवा बुकिंग",
    doesEn: ["List services with a duration", "Take a booking on WhatsApp", "See today's booking requests"],
    doesHi: ["अवधि के साथ सेवाएँ दिखाएँ", "WhatsApp पर बुकिंग लें", "आज की बुकिंग देखें"]
  },
  {
    id: "orders",
    module: "STORE",
    labelEn: "Orders",
    labelHi: "ऑर्डर",
    doesEn: ["See new orders as they come in", "Move an order from accepted to ready", "Keep today's order total"],
    doesHi: ["नए ऑर्डर आते ही देखें", "ऑर्डर को स्वीकार से तैयार तक ले जाएँ", "आज का ऑर्डर जोड़ देखें"]
  },
  {
    id: "whatsapp-orders",
    module: "STORE",
    labelEn: "WhatsApp orders",
    labelHi: "व्हाट्सऐप ऑर्डर",
    doesEn: ["Let a customer order from the page", "Send the order to your WhatsApp", "Take payment by UPI"],
    doesHi: ["ग्राहक पेज से ऑर्डर करे", "ऑर्डर आपके व्हाट्सऐप पर जाए", "UPI से भुगतान लें"]
  },
  {
    id: "store",
    module: "STORE",
    labelEn: "Store",
    labelHi: "स्टोर",
    doesEn: ["Set hours and holiday", "Choose delivery, takeaway, or dine-in", "Put your UPI ID on the page"],
    doesHi: ["समय और छुट्टी सेट करें", "डिलीवरी, टेकअवे या डाइन-इन चुनें", "पेज पर अपना UPI डालें"]
  },
  {
    id: "offers",
    module: "STORE",
    labelEn: "Offers",
    labelHi: "ऑफ़र",
    doesEn: ["Add a coupon code", "Show an offer banner", "Set a minimum order for the offer"],
    doesHi: ["कूपन कोड जोड़ें", "ऑफ़र बैनर दिखाएँ", "ऑफ़र के लिए न्यूनतम ऑर्डर रखें"]
  },
  {
    id: "campaigns",
    module: "REVIEWS",
    labelEn: "Campaigns",
    labelHi: "कैंपेन",
    doesEn: ["Write a WhatsApp message", "Send it to customers who agreed", "See how many were sent"],
    doesHi: ["व्हाट्सऐप संदेश लिखें", "सहमति देने वाले ग्राहकों को भेजें", "कितने भेजे गए, यह देखें"]
  },
  {
    id: "customers",
    module: "REVIEWS",
    labelEn: "Customers",
    labelHi: "ग्राहक",
    doesEn: ["See people who shared a phone number", "Tag a regular or a quiet customer", "Download the list"],
    doesHi: ["जिन लोगों ने नंबर दिया, उन्हें देखें", "नियमित या चुप ग्राहक को टैग करें", "सूची डाउनलोड करें"]
  },
  {
    id: "reviews-log",
    module: "REVIEWS",
    labelEn: "Reviews log",
    labelHi: "रिव्यू लॉग",
    doesEn: ["Read private feedback", "See the star rating and the date", "Mark a note as resolved"],
    doesHi: ["निजी प्रतिक्रिया पढ़ें", "स्टार और तारीख देखें", "नोट को हल हुआ चिह्नित करें"]
  },
  {
    id: "testimonials",
    module: "REVIEWS",
    labelEn: "Testimonials",
    labelHi: "प्रशंसापत्र",
    doesEn: ["Save a kind word from a customer", "Choose which ones are public", "Show them on your page"],
    doesHi: ["ग्राहक की अच्छी बात सहेजें", "कौन सी सार्वजनिक हैं, चुनें", "उन्हें अपने पेज पर दिखाएँ"]
  },
  {
    id: "ai-replies",
    module: "REVIEWS",
    labelEn: "AI replies",
    labelHi: "एआई जवाब",
    doesEn: ["Draft a public reply", "Draft a private WhatsApp reply", "You still send it yourself"],
    doesHi: ["सार्वजनिक जवाब का मसौदा", "निजी व्हाट्सऐप जवाब का मसौदा", "भेजना फिर भी आपके हाथ में है"]
  },
  {
    id: "analytics",
    module: "REVIEWS",
    labelEn: "Analytics",
    labelHi: "एनालिटिक्स",
    doesEn: ["See scans, taps, and page views", "Compare this week with the last", "See which QR is used most"],
    doesHi: ["स्कैन, टैप और पेज व्यू देखें", "इस हफ्ते की पिछले से तुलना करें", "कौन सा QR सबसे ज़्यादा खुला"]
  },
  {
    id: "pdf-report",
    module: "REVIEWS",
    labelEn: "PDF report",
    labelHi: "पीडीएफ रिपोर्ट",
    doesEn: ["Download a month as a PDF", "Share the file", "Keep scans and feedback in one place"],
    doesHi: ["महीने की पीडीएफ डाउनलोड करें", "फ़ाइल शेयर करें", "स्कैन और प्रतिक्रिया एक जगह"]
  },
  {
    id: "staff",
    module: "REVIEWS",
    labelEn: "Staff",
    labelHi: "स्टाफ़",
    doesEn: ["Invite someone by email", "See reviews tied to a person", "Turn access off when they leave"],
    doesHi: ["ईमेल से किसी को बुलाएँ", "किसी व्यक्ति के रिव्यू देखें", "जाने पर पहुँच बंद करें"]
  },
  {
    id: "locations",
    module: "REVIEWS",
    labelEn: "Locations",
    labelHi: "लोकेशन",
    doesEn: ["Add another branch", "Put a QR on that branch", "See which place a review came from"],
    doesHi: ["दूसरी शाखा जोड़ें", "उस शाखा पर QR रखें", "रिव्यू किस जगह से आया"]
  },
  {
    id: "nfc",
    module: "REVIEWS",
    labelEn: "NFC",
    labelHi: "एनएफसी",
    doesEn: ["Write your page onto a blank tag", "Check the tag after writing", "Lock the tag when it is right"],
    doesHi: ["खाली टैग पर अपना पेज लिखें", "लिखने के बाद टैग जाँचें", "ठीक हो तो टैग लॉक करें"]
  },
  {
    id: "multiple-qrs",
    module: "REVIEWS",
    labelEn: "Multiple QRs",
    labelHi: "कई क्यूआर",
    doesEn: ["Add a QR for another table", "Name each code", "See scans per code"],
    doesHi: ["दूसरी टेबल के लिए QR जोड़ें", "हर कोड का नाम रखें", "हर कोड के स्कैन देखें"]
  },
  {
    id: "direct-link",
    module: "REVIEWS",
    labelEn: "Direct link",
    labelHi: "डायरेक्ट लिंक",
    doesEn: ["Open one button instead of the page", "Send a tap straight to WhatsApp or the menu", "Keep the page for everyone else"],
    doesHi: ["पेज की जगह एक बटन खोलें", "टैप सीधे व्हाट्सऐप या मेनू पर जाए", "बाकी लोगों के लिए पेज रहे"]
  },
  {
    id: "page-themes",
    module: "REVIEWS",
    labelEn: "Page themes",
    labelHi: "पेज थीम",
    doesEn: ["Pick a look for your public page", "Match buttons and colours", "Preview it before you publish"],
    doesHi: ["सार्वजनिक पेज का रूप चुनें", "बटन और रंग मिलाएँ", "प्रकाशित करने से पहले झलक देखें"]
  },
  {
    id: "custom-domain",
    module: "REVIEWS",
    labelEn: "Custom domain",
    labelHi: "कस्टम डोमेन",
    doesEn: ["Use your own web address", "Show your name on the page", "Keep your colours"],
    doesHi: ["अपना वेब पता इस्तेमाल करें", "पेज पर अपना नाम दिखाएँ", "अपने रंग रखें"]
  }
] as const;

export type Feature = (typeof FEATURES)[number];
export type FeatureId = Feature["id"];

const BY_ID = new Map<string, Feature>(FEATURES.map((feature) => [feature.id, feature]));

export function isFeatureId(value: string): value is FeatureId {
  return BY_ID.has(value);
}

export function featureById(id: string): Feature | null {
  return BY_ID.get(id) ?? null;
}

export function featuresForModule(moduleId: FeatureModuleId): Feature[] {
  return FEATURES.filter((feature) => feature.module === moduleId);
}
