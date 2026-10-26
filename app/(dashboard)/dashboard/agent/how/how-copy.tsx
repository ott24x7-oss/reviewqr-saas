"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

const copy = {
  en: {
    title: "How team earnings work",
    points: [
      "There is no joining fee, ever.",
      "You earn only when a business you brought in pays for a subscription or a hardware order.",
      "Inviting someone onto the team does not pay you. Recruiting is not a sale.",
      "Your leader sets your share of that sale's commission, inside the platform caps. Changing a share changes only future sales.",
      "If a payment is refunded or reversed, every level of that commission is clawed back.",
      "A payout needs a PAN and a UPI ID or bank account. TDS follows the admin percent and the yearly threshold."
    ]
  },
  hi: {
    title: "टीम की कमाई कैसे होती है",
    points: [
      "जुड़ने की कोई फीस नहीं है।",
      "कमाई सिर्फ तब होती है जब आपका लाया हुआ बिज़नेस सब्सक्रिप्शन या हार्डवेयर का भुगतान करता है।",
      "किसी को टीम में बुलाने पर पैसे नहीं मिलते। भर्ती बिक्री नहीं है।",
      "लीडर आपकी बिक्री के कमीशन का हिस्सा तय करता है, प्लेटफॉर्म की सीमा के अंदर। हिस्सा बदलने से सिर्फ आगे की बिक्री बदलती है।",
      "भुगतान वापस या रद्द होने पर हर स्तर का कमीशन वापस हो जाता है।",
      "भुगतान के लिए पैन और यूपीआई या बैंक खाता चाहिए। टीडीएस एडमिन की दर और साल की सीमा के हिसाब से कटता है।"
    ]
  }
};

export function HowCopy() {
  const [lang, setLang] = React.useState<"en" | "hi">("en");
  const text = copy[lang];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button type="button" variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
          English
        </Button>
        <Button type="button" variant={lang === "hi" ? "default" : "outline"} onClick={() => setLang("hi")}>
          हिन्दी
        </Button>
      </div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{text.title}</h1>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        {text.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}
