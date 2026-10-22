"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/brand/password-field";
import {
  channelLine,
  LangToggle,
  OtpCodeField,
  useAuthLang,
  useResendCountdown,
  WhatsAppIcon
} from "@/components/auth/otp-ui";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { lang, choose, t } = useAuthLang();
  const [method, setMethod] = React.useState<"whatsapp" | "email">("whatsapp");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [phone, setPhone] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [channel, setChannel] = React.useState<string | undefined>();
  const [error, setError] = React.useState("");
  const [resendAfter, setResendAfter] = React.useState(30);
  const left = useResendCountdown(otpSent, resendAfter);

  React.useEffect(() => {
    if (search.get("verified") === "1") toast.success("Email confirmed. You can sign in.");
    if (search.get("verify") === "failed") toast.error("That confirmation link is invalid or expired.");
  }, [search]);

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      toast.error("Invalid email or password");
      return;
    }
    toast.success("Welcome back!");
    router.push(search.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  async function sendCode() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send the code");
      setOtpSent(true);
      setOtpCode("");
      setChannel(json.channel);
      setResendAfter(typeof json.resendAfterSec === "number" ? json.resendAfterSec : 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Invalid code");
      const signed = await signIn("credentials", {
        otpToken: json.otpToken,
        email: "otp-login@invalid.local",
        password: "unused",
        redirect: false
      });
      if (signed?.error) throw new Error("Could not sign in");
      toast.success("Welcome back!");
      router.push(search.get("callbackUrl") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  function changeNumber() {
    setOtpSent(false);
    setOtpCode("");
    setError("");
    setChannel(undefined);
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="text-center">
        <LangToggle lang={lang} choose={choose} />
        <CardTitle className="text-2xl font-display">
          {method === "whatsapp" ? t.loginTitle : "Welcome back"}
        </CardTitle>
        <CardDescription>
          {method === "whatsapp" ? t.loginSubtitle : "Sign in to manage your reviews"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {method === "whatsapp" ? (
          <form onSubmit={otpSent ? verifyCode : (event) => { event.preventDefault(); void sendCode(); }} className="space-y-4">
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            {!otpSent ? (
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t.phonePlaceholder}
                  className="h-11"
                />
              </div>
            ) : (
              <>
                <p className="text-sm">{t.notice}</p>
                <p className="text-sm">{channelLine(channel, t)}</p>
                <OtpCodeField id="otp" label={t.code} value={otpCode} onChange={setOtpCode} />
              </>
            )}
            <Button type="submit" className="auth-whatsapp w-full" disabled={loading || (otpSent && otpCode.length !== 6)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon />}
              {otpSent ? t.verify : t.send}
            </Button>
            {otpSent ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <button type="button" onClick={changeNumber}>{t.change}</button>
                <button type="button" disabled={left > 0 || loading} onClick={() => void sendCode()}>
                  {left > 0 ? t.resendIn(left) : t.resend}
                </button>
              </div>
            ) : null}
            <button type="button" className="w-full text-sm" onClick={() => { setMethod("email"); setError(""); }}>
              {t.emailInstead}
            </button>
          </form>
        ) : (
          <form onSubmit={signInWithPassword} className="space-y-4">
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@business.com"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <PasswordField
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign in
            </Button>
            <button type="button" className="w-full text-sm" onClick={() => { setMethod("whatsapp"); setError(""); }}>
              {t.whatsappInstead}
            </button>
          </form>
        )}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          New to ReviewQR?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </div>
        {process.env.NODE_ENV !== "production" ? (
          <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            <strong>Demo:</strong> demo@reviewqr.in / Demo@123
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}
