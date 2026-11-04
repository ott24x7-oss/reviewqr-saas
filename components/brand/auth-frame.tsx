"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { AuthLanguageProvider, LangToggle, useAuthLang } from "@/components/auth/otp-ui";
import { DEFAULT_BRAND_NAME } from "@/lib/brand-defaults";
import { BRAND_ICON } from "@/lib/brand-assets";
import { authFontClass } from "./fonts";
import { qrMarketingFonts } from "@/components/marketing/qr-site/fonts";

export function AuthFrame({
  children,
  showLanguageToggle = false
}: {
  children: React.ReactNode;
  showLanguageToggle?: boolean;
}) {
  return (
    <AuthLanguageProvider>
      <AuthFrameContent showLanguageToggle={showLanguageToggle}>{children}</AuthFrameContent>
    </AuthLanguageProvider>
  );
}

function AuthFrameContent({
  children,
  showLanguageToggle
}: {
  children: React.ReactNode;
  showLanguageToggle: boolean;
}) {
  const { lang, choose, t } = useAuthLang();

  return (
    <div className={`auth-shell ${authFontClass} ${qrMarketingFonts}`} data-language={lang} lang={lang}>
      <div className="auth-layout">
        <aside className="auth-trust" aria-label={t.trustLabel}>
          <ul>
            <li><Check aria-hidden="true" /> <span>{t.trustFree}</span></li>
            <li><Check aria-hidden="true" /> <span>{t.trustSetup}</span></li>
            <li><Check aria-hidden="true" /> <span>{t.trustLanguages}</span></li>
          </ul>
        </aside>
        <div className="auth-panel">
          <div className="auth-brand-header">
            <Link href="/" className="auth-brand-link" aria-label={t.homeLabel}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND_ICON} alt="" width={32} height={32} />
              <span>{DEFAULT_BRAND_NAME}</span>
            </Link>
            {showLanguageToggle ? <LangToggle lang={lang} choose={choose} /> : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
