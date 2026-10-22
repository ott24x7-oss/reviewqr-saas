"use client";
import * as React from "react";

export type AuthLang = "en" | "hi";

const COPY = {
  en: {
    loginTitle: "Login with WhatsApp",
    loginSubtitle: "We will send a 6-digit code to your WhatsApp.",
    registerTitle: "Start with WhatsApp",
    registerSubtitle: "14 days free. No password to remember.",
    phone: "Mobile number",
    phonePlaceholder: "98xxxxxxxx",
    send: "Login with WhatsApp",
    sendRegister: "Continue with WhatsApp",
    code: "6-digit code",
    verify: "Verify and sign in",
    verifyRegister: "Verify code",
    change: "Change number",
    resend: "Resend code",
    resendIn: (n: number) => `Resend in ${n}s`,
    emailInstead: "Use email instead",
    whatsappInstead: "Use WhatsApp instead",
    sentWhatsapp: "Code sent on WhatsApp.",
    sentEmail: "Code sent by email.",
    sentDev: "Code sent.",
    notice: "If this number is registered, a code was sent.",
    name: "Your name",
    business: "Business name",
    finish: "Create account",
    langEn: "EN",
    langHi: "हिं"
  },
  hi: {
    loginTitle: "WhatsApp से लॉगिन",
    loginSubtitle: "हम आपके WhatsApp पर 6 अंकों का कोड भेजेंगे।",
    registerTitle: "WhatsApp से शुरू करें",
    registerSubtitle: "14 दिन मुफ़्त। पासवर्ड याद रखने की ज़रूरत नहीं।",
    phone: "मोबाइल नंबर",
    phonePlaceholder: "98xxxxxxxx",
    send: "WhatsApp से लॉगिन",
    sendRegister: "WhatsApp से आगे बढ़ें",
    code: "6 अंकों का कोड",
    verify: "पुष्टि करें और साइन इन करें",
    verifyRegister: "कोड की पुष्टि करें",
    change: "नंबर बदलें",
    resend: "कोड फिर भेजें",
    resendIn: (n: number) => `${n} सेकंड में फिर भेजें`,
    emailInstead: "ईमेल से जारी रखें",
    whatsappInstead: "WhatsApp से जारी रखें",
    sentWhatsapp: "कोड WhatsApp पर भेजा गया।",
    sentEmail: "कोड ईमेल पर भेजा गया।",
    sentDev: "कोड भेज दिया गया।",
    notice: "अगर यह नंबर रजिस्टर है, तो कोड भेज दिया गया है।",
    name: "आपका नाम",
    business: "व्यवसाय का नाम",
    finish: "खाता बनाएँ",
    langEn: "EN",
    langHi: "हिं"
  }
} as const;

export function useAuthLang() {
  const [lang, setLang] = React.useState<AuthLang>("en");
  React.useEffect(() => {
    const saved = window.localStorage.getItem("reviewqr-auth-lang");
    if (saved === "hi" || saved === "en") setLang(saved);
  }, []);
  function choose(next: AuthLang) {
    setLang(next);
    window.localStorage.setItem("reviewqr-auth-lang", next);
  }
  return { lang, choose, t: COPY[lang] };
}

export function LangToggle({ lang, choose }: { lang: AuthLang; choose: (next: AuthLang) => void }) {
  return (
    <div className="mb-3 flex justify-end gap-2 text-xs">
      <button type="button" className="auth-lang" aria-pressed={lang === "en"} onClick={() => choose("en")}>
        EN
      </button>
      <button type="button" className="auth-lang" aria-pressed={lang === "hi"} onClick={() => choose("hi")}>
        हिं
      </button>
    </div>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M20.5 3.5A11 11 0 0 0 2.1 17.2L1 23l6-1.6A11 11 0 0 0 20.5 3.5zM12 20.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.5.9.9-3.4-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.3a.5.5 0 0 0 0-.5c0-.1-.5-1.2-.7-1.6s-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c.5.2 1 .4 1.5.6a3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.2-.1-.4-.2z"
      />
    </svg>
  );
}

export function channelLine(channel: string | undefined, t: (typeof COPY)[AuthLang]) {
  if (channel === "email") return t.sentEmail;
  if (channel === "dev") return t.sentDev;
  return t.sentWhatsapp;
}

export function OtpCodeField({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block space-y-1.5 text-sm" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        aria-label={label}
        className="w-full px-3 text-center text-2xl tracking-[0.4em]"
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
          if (!text) return;
          event.preventDefault();
          onChange(text);
        }}
      />
    </label>
  );
}

export function useResendCountdown(active: boolean, seconds: number) {
  const [left, setLeft] = React.useState(seconds);
  React.useEffect(() => {
    if (!active) {
      setLeft(0);
      return;
    }
    setLeft(seconds);
    const id = window.setInterval(() => {
      setLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, seconds]);
  return left;
}
