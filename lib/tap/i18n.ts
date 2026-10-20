export type TapLang = "en" | "hi";

const STRINGS = {
  en: {
    viewMenu: "View Menu",
    orderWhatsApp: "Order on WhatsApp",
    giveFeedback: "Give Feedback",
    openNow: "Open now",
    closedNow: "Closed now",
    unassignedTitle: "This QR is not activated yet",
    disabledTitle: "This QR is currently inactive",
    notFoundTitle: "We could not find this QR",
    privacyOrder:
      "Your name and table or address are saved with this order so the business can prepare it. Only that business can see them. To ask for deletion, use the privacy policy.",
    privacyFeedback:
      "Your rating is saved for the business owner. A name or phone number is saved only if you agree. To ask for deletion, use the privacy policy.",
    consent: "Save my phone number with this feedback",
    add: "Add",
    total: "Total",
    yourOrder: "Your order",
    hindi: "हिंदी",
    english: "English"
  },
  hi: {
    viewMenu: "मेनू देखें",
    orderWhatsApp: "WhatsApp पर ऑर्डर",
    giveFeedback: "प्रतिक्रिया दें",
    openNow: "अभी खुला है",
    closedNow: "अभी बंद है",
    unassignedTitle: "यह QR अभी चालू नहीं हुआ है",
    disabledTitle: "यह QR अभी निष्क्रिय है",
    notFoundTitle: "यह QR नहीं मिला",
    privacyOrder:
      "आपका नाम और टेबल या पता इस ऑर्डर के साथ इसलिए सेव होता है ताकि दुकान उसे तैयार कर सके। सिर्फ वही दुकान इसे देख सकती है। मिटाने के लिए गोपनीयता नीति देखें।",
    privacyFeedback:
      "आपकी रेटिंग दुकान के मालिक के लिए सेव होती है। नाम या फोन तभी सेव होता है जब आप सहमति दें। मिटाने के लिए गोपनीयता नीति देखें।",
    consent: "मेरा फोन नंबर इस प्रतिक्रिया के साथ सेव करें",
    add: "जोड़ें",
    total: "कुल",
    yourOrder: "आपका ऑर्डर",
    hindi: "हिंदी",
    english: "English"
  }
} as const;

export type TapStringKey = keyof (typeof STRINGS)["en"];

export function tapLang(header: string | null | undefined, stored?: string | null): TapLang {
  if (stored === "hi" || stored === "en") return stored;
  const value = (header || "").toLowerCase();
  return value.includes("hi") ? "hi" : "en";
}

export function tapText(lang: TapLang, key: TapStringKey) {
  return STRINGS[lang][key];
}
