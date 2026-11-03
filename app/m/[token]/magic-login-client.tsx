"use client";

import * as React from "react";
import Link from "next/link";
import { enterSession } from "@/components/auth/enter-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, Smartphone } from "lucide-react";

export default function MagicLoginClient({ token }: { token: string }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [android, setAndroid] = React.useState(false);

  React.useEffect(() => {
    setAndroid(/android/i.test(navigator.userAgent));
  }, []);

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
        throw new Error("This login link has expired or was already used.");
      }
      const entered = await enterSession(
        {
          otpToken: String(json.data.otpToken),
          email: "magic-login@invalid.local",
          password: "unused"
        },
        String(json.data.path || "/dashboard")
      );
      if (!entered.ok) throw new Error("Could not sign in. Please request a new login link.");
      window.location.assign(entered.path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in. Please request a new login link.");
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
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display">Log in to QR24x7</CardTitle>
          <CardDescription>Continue securely with your WhatsApp login link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
          <Button type="button" variant="gradient" size="lg" className="w-full" disabled={busy} onClick={() => void logIn()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Log in to QR24x7
          </Button>
          {android ? (
            <Button asChild type="button" variant="outline" size="lg" className="w-full">
              <a href={intentUrl} referrerPolicy="no-referrer">
                <Smartphone className="h-4 w-4" />
                Open in app
              </a>
            </Button>
          ) : null}
          <Link href="/login" className="block text-center text-sm text-primary hover:underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
