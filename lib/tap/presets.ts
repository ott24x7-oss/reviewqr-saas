export const LINK_TYPES = [
  "menu",
  "whatsapp_order",
  "feedback",
  "whatsapp_chat",
  "call",
  "directions",
  "instagram",
  "facebook",
  "youtube",
  "website",
  "upi",
  "wifi",
  "offer",
  "appointment",
  "vcard",
  "google",
  "trustpilot",
  "justdial",
  "zomato",
  "swiggy",
  "tripadvisor",
  "practo",
  "custom"
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

export type StoredLink = {
  key: string;
  type: LinkType;
  labelEn: string;
  labelHi: string;
  enabled: boolean;
  sort: number;
  featured: boolean;
  url: string;
  emoji: string;
  schedule: { from: string; to: string } | null;
};

const OPTIONAL_URL = new Set<LinkType>(["feedback", "menu", "whatsapp_order", "wifi", "offer", "appointment", "vcard"]);

export function linkNeedsUrl(type: string) {
  return !OPTIONAL_URL.has(type as LinkType);
}

function row(
  type: LinkType,
  labelEn: string,
  labelHi: string,
  sort: number,
  featured = false
): StoredLink {
  return {
    key: type,
    type,
    labelEn,
    labelHi,
    enabled: true,
    sort,
    featured,
    url: "",
    emoji: "",
    schedule: null
  };
}

export const CODE_PRESETS: Record<string, StoredLink[]> = {
  cafe: [
    row("menu", "View Menu", "मेनू देखें", 10, true),
    row("whatsapp_order", "Order on WhatsApp", "WhatsApp पर ऑर्डर", 20, true),
    row("feedback", "Give Feedback", "प्रतिक्रिया दें", 30, true),
    row("call", "Call", "कॉल करें", 40),
    row("directions", "Directions", "दिशा", 50),
    row("instagram", "Instagram", "Instagram", 60)
  ],
  restaurant: [
    row("menu", "View Menu", "मेनू देखें", 10, true),
    row("whatsapp_order", "Order on WhatsApp", "WhatsApp पर ऑर्डर", 20, true),
    row("feedback", "Give Feedback", "प्रतिक्रिया दें", 30, true),
    row("google", "Review on Google", "Google पर रिव्यू", 40),
    row("zomato", "Zomato", "Zomato", 50),
    row("call", "Call", "कॉल करें", 60),
    row("directions", "Directions", "दिशा", 70)
  ],
  salon: [
    row("appointment", "Book appointment", "अपॉइंटमेंट बुक करें", 10, true),
    row("feedback", "Give Feedback", "प्रतिक्रिया दें", 20, true),
    row("call", "Call", "कॉल करें", 30),
    row("instagram", "Instagram", "Instagram", 40),
    row("directions", "Directions", "दिशा", 50)
  ],
  clinic: [
    row("appointment", "Book appointment", "अपॉइंटमेंट बुक करें", 10, true),
    row("call", "Call", "कॉल करें", 20, true),
    row("directions", "Directions", "दिशा", 30),
    row("feedback", "Give Feedback", "प्रतिक्रिया दें", 40)
  ],
  shop: [
    row("menu", "View Menu", "मेनू देखें", 10, true),
    row("whatsapp_order", "Order on WhatsApp", "WhatsApp पर ऑर्डर", 20, true),
    row("feedback", "Give Feedback", "प्रतिक्रिया दें", 30),
    row("call", "Call", "कॉल करें", 40),
    row("whatsapp_chat", "WhatsApp", "WhatsApp", 50)
  ],
  other: [
    row("feedback", "Give Feedback", "प्रतिक्रिया दें", 10, true),
    row("call", "Call", "कॉल करें", 20),
    row("whatsapp_chat", "WhatsApp", "WhatsApp", 30),
    row("website", "Website", "वेबसाइट", 40)
  ]
};

export function industryKey(raw: string | null | undefined) {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return "other";
  if (value.includes("cafe") || value.includes("café")) return "cafe";
  if (value.includes("restaurant") || value.includes("food")) return "restaurant";
  if (value.includes("salon") || value.includes("beauty") || value.includes("spa")) return "salon";
  if (value.includes("clinic") || value.includes("hospital") || value.includes("doctor")) return "clinic";
  if (value.includes("shop") || value.includes("store") || value.includes("kirana") || value.includes("retail")) return "shop";
  if (CODE_PRESETS[value]) return value;
  return "other";
}
