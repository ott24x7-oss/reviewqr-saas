import {
  Utensils,
  Star,
  MessageCircle,
  IndianRupee,
  Phone as PhoneIcon,
  MapPin,
  Instagram,
  Wifi,
  ShoppingCart,
  Plus,
  Minus,
  CircleCheck,
  BellRing,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_PRESETS } from "@/lib/tap/themes";

/* ───────────── Linktree-style tap page ───────────── */
export type TapTheme = {
  name: string;
  background: string;
  text: string;
  sub: string;
  primary: string;
  primaryText: string;
  buttonBg: string;
  buttonText: string;
};

export const TAP_THEMES: TapTheme[] = THEME_PRESETS.map((theme) => ({
  name: theme.name,
  background: theme.tokens.background,
  text: theme.tokens.ink,
  sub: theme.tokens.muted,
  primary: theme.tokens.buttonFill || theme.tokens.buttonBg,
  primaryText: theme.tokens.buttonInk,
  buttonBg: theme.tokens.buttons === "glass" ? "color-mix(in srgb, white 22%, transparent)" : theme.tokens.bg,
  buttonText: theme.tokens.buttons === "glass" ? theme.tokens.buttonBg : theme.tokens.ink
}));

const TAP_LINKS = [
  { icon: Star, label: "Review us on Google" },
  { icon: MessageCircle, label: "Tell us privately" },
  { icon: IndianRupee, label: "Pay by UPI" }
];

export function TapPageScreen({ theme = TAP_THEMES[0] }: { theme?: TapTheme }) {
  return (
    <div className="flex h-full flex-col items-center px-4 pb-4 pt-10 transition-colors duration-500" style={{ background: theme.background, color: theme.text }}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold shadow-md" style={{ background: theme.primary, color: theme.primaryText }}>
        S
      </div>
      <p className="mt-2 text-base font-bold">Spice Junction Café</p>
      <p className="text-xs" style={{ color: theme.sub }}>Dosa · Coffee · Snacks</p>
      <p className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" /> Open now
      </p>

      <div className="mt-4 w-full space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-sm" style={{ background: theme.primary, color: theme.primaryText }}>
          <Utensils className="h-4 w-4" /> View menu &amp; order
        </div>
        {TAP_LINKS.map((l) => (
          <div key={l.label} className="flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium" style={{ background: theme.buttonBg, color: theme.buttonText, borderColor: "color-mix(in srgb, currentColor 25%, transparent)" }}>
            <l.icon className="h-4 w-4" /> {l.label}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-4" style={{ color: theme.sub }}>
        <PhoneIcon className="h-5 w-5" />
        <MapPin className="h-5 w-5" />
        <Instagram className="h-5 w-5" />
        <Wifi className="h-5 w-5" />
      </div>
      <p className="mt-auto text-[10px]" style={{ color: theme.sub }}>Powered by QR24x7</p>
    </div>
  );
}

/* ───────────── WhatsApp store ───────────── */
const ITEMS = [
  { name: "Masala Dosa", price: 120, qty: 2, veg: true, tone: "from-amber-200 to-orange-300" },
  { name: "Filter Coffee", price: 40, qty: 2, veg: true, tone: "from-stone-300 to-amber-700" },
  { name: "Paneer Tikka", price: 220, qty: 0, veg: true, tone: "from-orange-300 to-red-400" },
  { name: "Chicken 65", price: 260, qty: 0, veg: false, tone: "from-red-300 to-red-500" }
];

export function StoreScreen() {
  return (
    <div className="flex h-full flex-col bg-slate-50 pt-8">
      <div className="px-4">
        <p className="text-sm font-bold text-slate-900">Spice Junction Café</p>
        <div className="mt-2 flex gap-1.5 overflow-hidden text-[11px] font-medium">
          {["Bestsellers", "South Indian", "Beverages", "Snacks"].map((c, i) => (
            <span
              key={c}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1",
                i === 0 ? "bg-emerald-800 text-white" : "bg-white text-slate-700 border border-slate-200"
              )}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex-1 space-y-2 overflow-hidden px-4">
        {ITEMS.map((it) => (
          <div key={it.name} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
            <div className={cn("h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br", it.tone)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[12px] leading-tight font-semibold text-slate-900">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 shrink-0 rounded-[3px] border",
                    it.veg ? "border-emerald-600 bg-emerald-500/30" : "border-red-600 bg-red-500/30"
                  )}
                  role="img"
                  aria-label={it.veg ? "Veg" : "Non-veg"}
                />
                {it.name}
              </p>
              <p className="marketing-rupee text-xs text-slate-500">₹{it.price}</p>
            </div>
            {it.qty > 0 ? (
              <div className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-1 py-1 text-xs font-bold text-emerald-700">
                <Minus className="h-3 w-3" /> {it.qty} <Plus className="h-3 w-3" />
              </div>
            ) : (
              <span className="shrink-0 rounded-lg border border-emerald-800 px-2 py-1 text-xs font-bold text-emerald-800">ADD</span>
            )}
          </div>
        ))}
      </div>
      <div className="m-3 flex items-center justify-between rounded-xl bg-emerald-800 px-3 py-3 text-white shadow-lg">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold">
          <ShoppingCart className="h-4 w-4" /> 4 · <span className="marketing-rupee">₹320</span>
        </span>
        <span className="whitespace-nowrap text-[11px] font-bold">Order on WhatsApp →</span>
      </div>
    </div>
  );
}

export function WhatsAppOrderBubble({ className }: { className?: string }) {
  return (
    <div className={cn("w-[250px] rounded-2xl bg-[#e7ffdb] p-3 text-[12px] leading-relaxed text-slate-800 shadow-xl", className)}>
      <p className="font-bold">🧾 New order #1042</p>
      <p>2 × Masala Dosa — <span className="marketing-rupee">₹240</span></p>
      <p>2 × Filter Coffee — <span className="marketing-rupee">₹80</span></p>
      <p className="mt-1 font-bold">Total: <span className="marketing-rupee">₹320</span> · Table 4</p>
      <p className="text-emerald-700 underline">Pay by UPI: upi://pay?am=320</p>
      <p className="mt-1 text-right text-[10px] text-slate-700">10:24 AM ✓✓</p>
    </div>
  );
}

/* ───────────── Review & feedback ───────────── */
export function ReviewScreen() {
  return (
    <div className="flex h-full flex-col items-center bg-white px-4 pt-10 text-center">
      <p className="text-sm font-bold text-slate-900">How was your visit?</p>
      <p className="text-xs text-slate-500">Spice Junction Café</p>
      <div className="mt-4 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className="h-8 w-8 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <div className="mt-5 w-full space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white">
          <Star className="h-4 w-4" /> Post review on Google
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700">
          <Lock className="h-4 w-4" /> Tell the owner privately
        </div>
      </div>
      <div className="mt-5 w-full rounded-xl bg-slate-50 p-3 text-left">
        <p className="text-[11px] font-semibold text-slate-500">AI helps polish your words</p>
        <p className="mt-1 text-xs text-slate-700">“Crispy dosa, quick service and very friendly staff.”</p>
      </div>
    </div>
  );
}

export function AlertToast({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-[230px] items-start gap-2.5 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200", className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
        <BellRing className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-bold text-slate-900">Private feedback · 2★</p>
        <p className="text-[11px] text-slate-500">“Coffee was cold today.” Reply on WhatsApp</p>
      </div>
    </div>
  );
}

export function OrderToast({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-[210px] items-center gap-2.5 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200", className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CircleCheck className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-bold text-slate-900">
          New order · <span className="marketing-rupee">₹320</span>
        </p>
        <p className="text-[11px] text-slate-500">Table 4 · via NFC tap</p>
      </div>
    </div>
  );
}
