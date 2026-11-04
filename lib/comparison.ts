import type { SeoLocale } from "@/lib/seo";

export const COMPARISON_PATH = "/compare/commission-free-whatsapp-ordering";

const COPY = {
  en: {
    title: "QR24x7 vs commission based food ordering apps",
    intro: "A QR24x7 page gives restaurants a direct way to show a menu and receive order enquiries on WhatsApp. A marketplace app can also put a restaurant in front of diners searching nearby. The right setup depends on how customers find you and how much control you need.",
    rows: [
      ["Commission", "QR24x7 does not charge commission on WhatsApp orders. Plan fees may apply.", "Marketplace fees and promotional charges vary by contract and order source; check your current agreement."],
      ["Customer relationship", "Orders open in your WhatsApp conversation. You handle replies and retain the contact details visible in that chat, subject to your privacy practices.", "The platform processes the marketplace order and controls what customer details it shares with you."],
      ["Branding", "Use your own business name, menu, colours and QR page.", "Your restaurant appears within the marketplace experience and its listing rules."],
      ["Discovery", "Customers need your QR, link or existing audience to reach your page.", "Marketplace search can introduce your listing to diners who are already browsing there."],
      ["Setup", "Add a menu and WhatsApp number, then share or print a QR code. Confirm each order directly.", "Apply to the marketplace, complete its onboarding, configure the catalogue and follow its order workflow."],
      ["Costs", "A QR24x7 subscription can apply; there is no QR24x7 per-order commission. WhatsApp, payment and delivery services may have their own charges.", "The app may charge commissions, fees or ad spend under your agreement. Review the latest terms and settlement statement."]
    ],
    marketplaceTitle: "When a marketplace app is still useful",
    marketplaceBody: "A marketplace can be valuable when you need discovery beyond your current customer base, delivery logistics, in-app payment, or a familiar ordering experience. Some diners search there first. Many restaurants use a marketplace for discovery and a direct page for regular guests, pickup, menu access and enquiries. Compare the actual costs, reach and operating effort for your location before choosing.",
    faqs: [
      { question: "Does QR24x7 replace a food marketplace?", answer: "Not by itself. QR24x7 gives you a direct menu and WhatsApp enquiry path; a marketplace may provide search discovery, delivery or payment services." },
      { question: "Does commission free mean no costs?", answer: "No. QR24x7 plan fees may apply, and your own payment, delivery or WhatsApp services can have separate costs. The distinction is that QR24x7 does not charge a per-order commission on these WhatsApp orders." },
      { question: "Do customers need to install an app?", answer: "No. They open your page in a browser and can send their order to your WhatsApp number." },
      { question: "Can I use both approaches?", answer: "Yes. You can keep a marketplace listing for discovery and use your direct page with customers who already know your restaurant." }
    ],
    cta: "Give regular customers a direct way to browse and message your restaurant."
  },
  hi: {
    title: "QR24x7 और कमीशन वाले फ़ूड ऑर्डर ऐप की तुलना",
    intro: "QR24x7 पेज से रेस्तराँ मेनू दिखाकर WhatsApp पर सीधे ऑर्डर पूछताछ पा सकता है। मार्केटप्लेस ऐप आसपास खाना खोज रहे नए लोगों तक रेस्तराँ पहुँचा सकता है। सही विकल्प इस बात पर निर्भर है कि ग्राहक आपको कैसे खोजते हैं और आपको कितना नियंत्रण चाहिए।",
    rows: [
      ["कमीशन", "WhatsApp ऑर्डर पर QR24x7 कमीशन नहीं लेता। प्लान शुल्क हो सकता है।", "मार्केटप्लेस शुल्क और प्रचार लागत अनुबंध और ऑर्डर के स्रोत के अनुसार बदलते हैं; अपना मौजूदा समझौता देखें।"],
      ["ग्राहक से संपर्क", "ऑर्डर आपके WhatsApp चैट में खुलता है। जवाब आप देते हैं और उस चैट में दिखने वाले संपर्क विवरण आपकी गोपनीयता प्रक्रिया के अधीन आपके पास रहते हैं।", "मार्केटप्लेस ऑर्डर प्लेटफ़ॉर्म संभालता है और तय करता है कि ग्राहक की कौन-सी जानकारी आपको मिलेगी।"],
      ["ब्रांडिंग", "अपने कारोबार का नाम, मेनू, रंग और QR पेज इस्तेमाल करें।", "रेस्तराँ मार्केटप्लेस के अनुभव और लिस्टिंग नियमों के भीतर दिखता है।"],
      ["नए ग्राहक", "ग्राहक को आपके पेज तक पहुँचने के लिए QR, लिंक या आपके मौजूदा प्रचार की ज़रूरत है।", "मार्केटप्लेस खोज में पहले से ब्राउज़ कर रहे लोग आपकी लिस्टिंग देख सकते हैं।"],
      ["सेटअप", "मेनू और WhatsApp नंबर जोड़ें, फिर QR साझा या प्रिंट करें। हर ऑर्डर की पुष्टि आप सीधे करें।", "मार्केटप्लेस में आवेदन करें, ऑनबोर्डिंग पूरी करें, कैटलॉग बनाएँ और उनके ऑर्डर तरीके का पालन करें।"],
      ["लागत", "QR24x7 सदस्यता शुल्क हो सकता है; प्रति ऑर्डर QR24x7 कमीशन नहीं है। WhatsApp, भुगतान और डिलीवरी सेवाओं के अलग शुल्क हो सकते हैं।", "आपके समझौते के तहत कमीशन, शुल्क या विज्ञापन खर्च हो सकता है। नवीनतम शर्तें और भुगतान विवरण देखें।"]
    ],
    marketplaceTitle: "मार्केटप्लेस ऐप कब उपयोगी रहता है",
    marketplaceBody: "जब आपको मौजूदा ग्राहकों से आगे नए लोगों तक पहुँचना हो, डिलीवरी व्यवस्था चाहिए, ऐप में भुगतान लेना हो या जानी-पहचानी ऑर्डर प्रक्रिया चाहिए, तब मार्केटप्लेस काम आ सकता है। कुछ ग्राहक वहीं खोजते हैं। कई रेस्तराँ नए ग्राहक पाने के लिए मार्केटप्लेस और नियमित मेहमानों, पिकअप, मेनू तथा पूछताछ के लिए सीधा पेज दोनों रखते हैं। चुनने से पहले अपने शहर की वास्तविक लागत, पहुँच और काम की तुलना करें।",
    faqs: [
      { question: "क्या QR24x7 फ़ूड मार्केटप्लेस की जगह लेता है?", answer: "अपने आप नहीं। QR24x7 सीधा मेनू और WhatsApp पूछताछ देता है; मार्केटप्लेस खोज, डिलीवरी या भुगतान दे सकता है।" },
      { question: "कमीशन नहीं तो क्या कोई खर्च नहीं?", answer: "नहीं। QR24x7 प्लान और आपके भुगतान, डिलीवरी या WhatsApp सेवा के अलग खर्च हो सकते हैं। फ़र्क यह है कि इन WhatsApp ऑर्डर पर QR24x7 प्रति ऑर्डर कमीशन नहीं लेता।" },
      { question: "क्या ग्राहक को ऐप इंस्टॉल करना होगा?", answer: "नहीं। पेज ब्राउज़र में खुलता है और ग्राहक ऑर्डर आपके WhatsApp नंबर पर भेज सकता है।" },
      { question: "क्या दोनों तरीके इस्तेमाल कर सकते हैं?", answer: "हाँ। नए लोगों तक पहुँचने के लिए मार्केटप्लेस रखें और अपने परिचित ग्राहकों को सीधा पेज दें।" }
    ],
    cta: "नियमित ग्राहकों को अपना मेनू देखने और सीधे संदेश भेजने का तरीका दें।"
  }
} as const;

export function comparisonCopy(locale: SeoLocale) { return COPY[locale]; }
