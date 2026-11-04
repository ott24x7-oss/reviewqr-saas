"use client";

import * as React from "react";

export type AuthLang = "en" | "hi";

const COPY = {
  en: {
    languageLabel: "Language",
    switchToEnglish: "Switch language to English",
    switchToHindi: "Switch language to Hindi",
    homeLabel: "QR24x7 home",
    trustLabel: "About QR24x7",
    trustFree: "Free plan available",
    trustSetup: "Set up in 10 minutes",
    trustLanguages: "Hindi + English",
    loginTitle: "Sign in",
    loginSubtitle: "Manage your QR24x7 business account.",
    registerTitle: "Start with WhatsApp",
    registerSubtitle: "14 days free. No password to remember.",
    startTrialTitle: "Start your free trial",
    startTrialSubtitle: "14 days free · no credit card needed",
    phone: "Mobile number",
    phonePlaceholder: "98xxxxxxxx",
    send: "Login with WhatsApp",
    sendRegister: "Continue with WhatsApp",
    code: "6-digit code",
    verify: "Verify and sign in",
    verifyRegister: "Verify code",
    change: "Change number",
    name: "Your name",
    finish: "Create account",
    resend: "Resend code",
    resendIn: (n: number) => `Resend in ${n}s`,
    emailInstead: "Use email instead",
    whatsappInstead: "Use WhatsApp instead",
    sentWhatsapp: "Code sent on WhatsApp.",
    sentEmail: "Code sent by email.",
    sentDev: "Code sent.",
    notice: "If this number is registered, a code was sent.",
    continueWhatsApp: "Continue with WhatsApp",
    orUseEmail: "or use email",
    loginMethod: "Sign-in method",
    email: "Email",
    emailPlaceholder: "you@business.com",
    password: "Password",
    signIn: "Sign in",
    welcomeBack: "Welcome back!",
    passwordMode: "Password",
    emailCodeMode: "Email code",
    sendEmailCode: "Send code",
    verifyEmailCode: "Verify and sign in",
    emailCodeLabel: "6-digit code",
    sentEmailCode: "If your email is registered, a code was sent.",
    resendEmailCode: "Resend code",
    resendEmailIn: (n: number) => `Resend in ${n}s`,
    changeEmail: "Change email",
    requestEmailCodeFailed: "Could not send a code. Please try again.",
    verifyEmailCodeFailed: "Could not verify the code. Please try again.",
    invalidCredentials: "Invalid email or password.",
    emailConfirmed: "Email confirmed. You can sign in.",
    confirmationExpired: "That confirmation link is invalid or expired.",
    forgot: "Forgot password?",
    newTo: "New to QR24x7?",
    createAccount: "Create an account",
    alreadyHaveAccount: "Already have an account?",
    showPassword: "Show",
    hidePassword: "Hide",
    yourName: "Your name",
    yourNameRequired: "Your name *",
    namePlaceholder: "Rakesh Sharma",
    mobile: "Mobile",
    business: "Business name",
    businessPlaceholder: "Spice Junction Café",
    emailRequired: "Email *",
    passwordRequired: "Password *",
    passwordHint: "At least 8 characters",
    passwordRequirement: "Min 8 chars, 1 uppercase, 1 number",
    trialBenefit: "14-day free trial of Growth plan",
    noCardBenefit: "No credit card required to start",
    freePlanBenefit: "Cancel anytime, downgrade to Free",
    registrationRequired: "Please fill all required fields.",
    registrationFailed: "Registration failed. Please try again.",
    accountCreatedLogin: "Account created — please log in.",
    welcome: "Welcome to QR24x7!",
    somethingWrong: "Something went wrong. Please try again.",
    sendCodeFailed: "Could not send a code. Please try again.",
    invalidCode: "Invalid code. Please try again.",
    createAccountFailed: "Could not create the account. Please try again.",
    loginTitleForgot: "Reset your password",
    forgotDescription: "Enter your email and we'll send you a reset link.",
    forgotSentDescription: "If an account exists, we've sent a reset link to your email.",
    sendResetLink: "Send reset link",
    inboxCheck: "Check your inbox at",
    linkExpires: "The link expires in 30 minutes.",
    backToLogin: "Back to login",
    forgotRequestFailed: "Something went wrong. Please try again.",
    resetTitle: "Choose a new password",
    resetDescription: "At least 8 characters, with one uppercase letter and one number.",
    missingToken: "This link is missing a token.",
    requestNewLink: "Request a new one",
    newPassword: "New password",
    updatePassword: "Update password",
    resetFailed: "Could not reset the password. Please request a new link.",
    passwordUpdated: "Password updated. Sign in with the new one.",
    magicTitle: "Log in to QR24x7",
    magicDescription: "Continue securely with your WhatsApp login link.",
    magicExpired: "This login link has expired or was already used.",
    magicFailed: "Could not sign in. Please request a new login link.",
    openInApp: "Open in app",
    demo: "Demo",
    loading: "Loading"
  },
  hi: {
    languageLabel: "भाषा",
    switchToEnglish: "भाषा English में बदलें",
    switchToHindi: "भाषा हिंदी में बदलें",
    homeLabel: "QR24x7 होम",
    trustLabel: "QR24x7 के बारे में",
    trustFree: "मुफ़्त प्लान उपलब्ध",
    trustSetup: "10 मिनट में सेटअप",
    trustLanguages: "हिंदी + English",
    loginTitle: "लॉगिन करें",
    loginSubtitle: "अपना QR24x7 बिज़नेस अकाउंट मैनेज करें।",
    registerTitle: "WhatsApp से शुरू करें",
    registerSubtitle: "14 दिन मुफ़्त। पासवर्ड याद रखने की ज़रूरत नहीं।",
    startTrialTitle: "अपना मुफ़्त ट्रायल शुरू करें",
    startTrialSubtitle: "14 दिन मुफ़्त · क्रेडिट कार्ड की ज़रूरत नहीं",
    phone: "मोबाइल नंबर",
    phonePlaceholder: "98xxxxxxxx",
    send: "WhatsApp से लॉगिन",
    sendRegister: "WhatsApp से आगे बढ़ें",
    code: "6 अंकों का कोड",
    verify: "पुष्टि करें और साइन इन करें",
    verifyRegister: "कोड की पुष्टि करें",
    change: "नंबर बदलें",
    name: "आपका नाम",
    finish: "खाता बनाएँ",
    resend: "कोड फिर भेजें",
    resendIn: (n: number) => `${n} सेकंड में फिर भेजें`,
    emailInstead: "ईमेल से जारी रखें",
    whatsappInstead: "WhatsApp से जारी रखें",
    sentWhatsapp: "कोड WhatsApp पर भेजा गया।",
    sentEmail: "कोड ईमेल पर भेजा गया।",
    sentDev: "कोड भेज दिया गया।",
    notice: "अगर यह नंबर रजिस्टर है, तो कोड भेज दिया गया है।",
    continueWhatsApp: "WhatsApp से जारी रखें",
    orUseEmail: "या ईमेल से जारी रखें",
    loginMethod: "लॉगिन का तरीका",
    email: "ईमेल",
    emailPlaceholder: "you@business.com",
    password: "पासवर्ड",
    signIn: "लॉगिन करें",
    welcomeBack: "वापसी पर स्वागत है!",
    passwordMode: "पासवर्ड",
    emailCodeMode: "ईमेल कोड",
    sendEmailCode: "कोड भेजें",
    verifyEmailCode: "पुष्टि करें और लॉगिन करें",
    emailCodeLabel: "6 अंकों का कोड",
    sentEmailCode: "अगर इस ईमेल पर खाता है, तो कोड भेज दिया गया है।",
    resendEmailCode: "कोड फिर भेजें",
    resendEmailIn: (n: number) => `${n} सेकंड में फिर भेजें`,
    changeEmail: "ईमेल बदलें",
    requestEmailCodeFailed: "कोड नहीं भेजा जा सका। फिर कोशिश करें।",
    verifyEmailCodeFailed: "कोड की पुष्टि नहीं हो सकी। फिर कोशिश करें।",
    invalidCredentials: "ईमेल या पासवर्ड सही नहीं है।",
    emailConfirmed: "ईमेल की पुष्टि हो गई। अब लॉगिन करें।",
    confirmationExpired: "पुष्टि लिंक अमान्य है या इसकी अवधि समाप्त हो गई है।",
    forgot: "पासवर्ड भूल गए?",
    newTo: "QR24x7 पर नए हैं?",
    createAccount: "अकाउंट बनाएँ",
    alreadyHaveAccount: "पहले से अकाउंट है?",
    showPassword: "दिखाएँ",
    hidePassword: "छिपाएँ",
    yourName: "आपका नाम",
    yourNameRequired: "आपका नाम *",
    namePlaceholder: "राकेश शर्मा",
    mobile: "मोबाइल",
    business: "व्यवसाय का नाम",
    businessPlaceholder: "स्पाइस जंक्शन कैफ़े",
    emailRequired: "ईमेल *",
    passwordRequired: "पासवर्ड *",
    passwordHint: "कम से कम 8 अक्षर",
    passwordRequirement: "कम से कम 8 अक्षर, 1 बड़ा अक्षर और 1 अंक",
    trialBenefit: "Growth प्लान का 14 दिन का मुफ़्त ट्रायल",
    noCardBenefit: "शुरू करने के लिए क्रेडिट कार्ड की ज़रूरत नहीं",
    freePlanBenefit: "कभी भी रद्द करें या Free प्लान पर जाएँ",
    registrationRequired: "कृपया सभी ज़रूरी फ़ील्ड भरें।",
    registrationFailed: "रजिस्ट्रेशन नहीं हो सका। फिर कोशिश करें।",
    accountCreatedLogin: "अकाउंट बन गया है — कृपया लॉगिन करें।",
    welcome: "QR24x7 में आपका स्वागत है!",
    somethingWrong: "कुछ गड़बड़ हुई। फिर कोशिश करें।",
    sendCodeFailed: "कोड नहीं भेजा जा सका। फिर कोशिश करें।",
    invalidCode: "कोड सही नहीं है। फिर कोशिश करें।",
    createAccountFailed: "अकाउंट नहीं बन सका। फिर कोशिश करें।",
    loginTitleForgot: "पासवर्ड रीसेट करें",
    forgotDescription: "अपना ईमेल डालें। हम रीसेट लिंक भेजेंगे।",
    forgotSentDescription: "अगर अकाउंट मौजूद है, तो हमने आपके ईमेल पर रीसेट लिंक भेजा है।",
    sendResetLink: "रीसेट लिंक भेजें",
    inboxCheck: "अपना इनबॉक्स देखें:",
    linkExpires: "लिंक 30 मिनट में समाप्त हो जाएगा।",
    backToLogin: "लॉगिन पर वापस जाएँ",
    forgotRequestFailed: "कुछ गड़बड़ हुई। फिर कोशिश करें।",
    resetTitle: "नया पासवर्ड चुनें",
    resetDescription: "कम से कम 8 अक्षर, 1 बड़ा अक्षर और 1 अंक रखें।",
    missingToken: "इस लिंक में टोकन नहीं है।",
    requestNewLink: "नया लिंक माँगें",
    newPassword: "नया पासवर्ड",
    updatePassword: "पासवर्ड अपडेट करें",
    resetFailed: "पासवर्ड रीसेट नहीं हो सका। नया लिंक माँगें।",
    passwordUpdated: "पासवर्ड अपडेट हो गया। नए पासवर्ड से लॉगिन करें।",
    magicTitle: "QR24x7 में लॉगिन करें",
    magicDescription: "अपने WhatsApp लॉगिन लिंक से सुरक्षित रूप से जारी रखें।",
    magicExpired: "यह लॉगिन लिंक समाप्त हो गया है या पहले ही इस्तेमाल हो चुका है।",
    magicFailed: "लॉगिन नहीं हो सका। नया लॉगिन लिंक माँगें।",
    openInApp: "ऐप में खोलें",
    demo: "डेमो",
    loading: "लोड हो रहा है"
  }
} as const;

type AuthCopy = (typeof COPY)[AuthLang];
type AuthLanguageContextValue = {
  lang: AuthLang;
  choose: (next: AuthLang) => void;
  t: AuthCopy;
};

const AuthLanguageContext = React.createContext<AuthLanguageContextValue | null>(null);

export function AuthLanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<AuthLang>("en");

  React.useEffect(() => {
    const saved = window.localStorage.getItem("reviewqr-auth-lang");
    if (saved === "hi" || saved === "en") setLang(saved);
  }, []);

  const choose = React.useCallback((next: AuthLang) => {
    setLang(next);
    window.localStorage.setItem("reviewqr-auth-lang", next);
  }, []);

  const value = React.useMemo(() => ({ lang, choose, t: COPY[lang] }), [lang, choose]);
  return <AuthLanguageContext.Provider value={value}>{children}</AuthLanguageContext.Provider>;
}

export function useAuthLang() {
  const context = React.useContext(AuthLanguageContext);
  if (!context) throw new Error("useAuthLang must be used inside AuthFrame");
  return context;
}

export function LangToggle({ lang, choose }: Pick<AuthLanguageContextValue, "lang" | "choose">) {
  const t = COPY[lang];
  return (
    <div className="auth-lang-toggle" role="group" aria-label={t.languageLabel}>
      <button
        type="button"
        className="auth-lang"
        aria-label={t.switchToEnglish}
        aria-pressed={lang === "en"}
        onClick={() => choose("en")}
      >
        EN
      </button>
      <button
        type="button"
        className="auth-lang"
        aria-label={t.switchToHindi}
        aria-pressed={lang === "hi"}
        onClick={() => choose("hi")}
      >
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

export function channelLine(channel: string | undefined, t: AuthCopy) {
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
    <label className="auth-otp-field" htmlFor={id}>
      <span className="auth-field-label">{label}</span>
      <span className="auth-otp-wrap">
        <span className="auth-otp-cells" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className="auth-otp-cell"
              data-filled={index < value.length}
              data-current={index === Math.min(value.length, 5)}
            >
              {value[index] || ""}
            </span>
          ))}
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={value}
          aria-label={label}
          className="auth-otp-input"
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!text) return;
            event.preventDefault();
            onChange(text);
          }}
        />
      </span>
    </label>
  );
}

export function useResendCountdown(active: boolean, seconds: number, resetKey?: number) {
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
  }, [active, seconds, resetKey]);
  return left;
}
