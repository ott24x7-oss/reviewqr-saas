import {
  CalendarDays,
  Contact,
  ExternalLink,
  Facebook,
  Globe,
  IndianRupee,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Tag,
  Utensils,
  Wifi,
  Youtube,
  type LucideIcon
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  menu: Utensils,
  whatsapp_order: MessageCircle,
  whatsapp_chat: MessageCircle,
  feedback: Star,
  call: Phone,
  directions: MapPin,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  website: Globe,
  upi: IndianRupee,
  wifi: Wifi,
  offer: Tag,
  appointment: CalendarDays,
  vcard: Contact,
  google: Star,
  trustpilot: Star,
  justdial: Star,
  zomato: Star,
  swiggy: Star,
  tripadvisor: Star,
  practo: Star
};

export function TapIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] || ExternalLink;
  return <Icon className={className} aria-hidden="true" strokeWidth={2} />;
}
