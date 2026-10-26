import { AppText } from "@/components/app-ui/i18n";
import { PlanLockNotice } from "@/components/app-ui/primitives";

export function ModuleUpsell({
  title,
  body,
  href
}: {
  title: string;
  body: string;
  href: string;
}) {
  const hindi: Record<string, string> = {
    "Add Reviews to collect feedback and public review links.": "रिव्यू और पब्लिक रिव्यू लिंक के लिए Reviews जोड़ें।",
    "Add Menu to show your catalogue on the tap page.": "टैप पेज पर अपने उत्पाद दिखाने के लिए Menu जोड़ें।",
    "Add WhatsApp Store to take orders.": "ऑर्डर लेने के लिए WhatsApp Store जोड़ें।"
  };
  const titleHindi = title.startsWith("Add WhatsApp Store") ? title.replace("Add WhatsApp Store", "WhatsApp Store जोड़ें") : title;
  return <PlanLockNotice
    title={<AppText en={title} hi={titleHindi} />}
    body={<AppText en={body} hi={hindi[body] || body} />}
    href={href}
  />;
}
