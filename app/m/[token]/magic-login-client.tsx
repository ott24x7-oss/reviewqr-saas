"use client";

import * as React from "react";
import Link from "next/link";
import { enterSession } from "@/components/auth/enter-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, Smartphone } from "lucide-react";
import { useAuthLang } from "@/components/auth/otp-ui";

export default function MagicLoginClient({ token, android }: { token: string; android: boolean }) {
  const { t } = useAuthLang();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function logIn() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/magic/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token, mode: "web" })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.data?.otpToken) {
        throw new Error(t.magicExpired);
      }
      const entered = await enterSession(
        {
          otpToken: String(json.data.otpToken),
          email: "magic-login@invalid.local",
          password: "unused"
        },
        String(json.data.path || "/dashboard")
      );
      if (!entered.ok) throw new Error(t.magicFailed);
      window.location.assign(entered.path);
    } catch (cause) {
      setError(cause instanceof Error && cause.message === t.magicExpired ? t.magicExpired : t.magicFailed);
      setBusy(false);
    }
  }

  const encodedToken = encodeURIComponent(token);
  const fallback =
    typeof window === "undefined"
      ? `https://qr24x7.in/m/${encodedToken}`
      : `${window.location.origin}/m/${encodedToken}`;
  const intentUrl =
    `intent://qr24x7.in/m/${encodedToken}` +
    `#Intent;scheme=https;package=com.qr24x7.app;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;

  return (
      <Card className="shadow-card">
        <CardHeader className="auth-card-header">
          <CardTitle className="text-2xl font-display">{t.magicTitle}</CardTitle>
          <CardDescription>{t.magicDescription}</CardDescription>
        </CardHeader>
        <CardContent className="auth-card-content space-y-4">
          {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
          <Button type="button" size="lg" className="auth-primary-button w-full" disabled={busy} onClick={() => void logIn()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {t.magicTitle}
          </Button>
          {android ? (
            <Button asChild type="button" variant="outline" size="lg" className="w-full">
              <a href={intentUrl} referrerPolicy="no-referrer">
                <Smartphone className="h-4 w-4" />
                {t.openInApp}
              </a>
            </Button>
          ) : null}
          <Link href="/login" className="auth-back-link">
            ← {t.backToLogin}
          </Link>
        </CardContent>
      </Card>
  );
}
