"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { enterSession } from "@/components/auth/enter-session";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/brand/password-field";
import {
  LangToggle,
  OtpCodeField,
  useAuthLang,
  useResendCountdown,
  WhatsAppIcon
} from "@/components/auth/otp-ui";

type MagicConfig = { enabled: boolean; waUrl: string };

function LoginForm() {
  const search = useSearchParams();
  const { lang, choose, t } = useAuthLang();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mode, setMode] = React.useState<"password" | "email-code">("password");
  const [codeSent, setCodeSent] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [resendCycle, setResendCycle] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [magic, setMagic] = React.useState<MagicConfig | null>(null);
  const resendLeft = useResendCountdown(codeSent, 30, resendCycle);

  React.useEffect(() => {
    let live = true;
    fetch("/api/v1/auth/magic/config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (live && config && typeof config.enabled === "boolean" && typeof config.waUrl === "string") {
          setMagic(config);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  React.useEffect(() => {
    if (search.get("verified") === "1") toast.success("Email confirmed. You can sign in.");
    if (search.get("verify") === "failed") toast.error("That confirmation link is invalid or expired.");
  }, [search]);

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const entered = await enterSession(
      { email: email.trim().toLowerCase(), password },
      search.get("callbackUrl")
    );
    setLoading(false);
    if (!entered.ok) {
      setError("Invalid email or password");
      toast.error("Invalid email or password");
      return;
    }
    toast.success(t.welcomeBack);
    window.location.assign(entered.path);
  }

  async function sendEmailCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/email-otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error?.message || t.requestEmailCodeFailed);
      setCodeSent(true);
      setCode("");
      setResendCycle((value) => value + 1);
      toast.success(t.sentEmailCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.requestEmailCodeFailed);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmailCode(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/email-otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, mode: "web" })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.data?.otpToken) {
        throw new Error(json?.error?.message || t.verifyEmailCodeFailed);
      }
      const entered = await enterSession({ otpToken: String(json.data.otpToken) }, search.get("callbackUrl") || json.data.path);
      if (!entered.ok) throw new Error(t.verifyEmailCodeFailed);
      toast.success(t.welcomeBack);
      window.location.assign(entered.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.verifyEmailCodeFailed);
    } finally {
      setLoading(false);
    }
  }

  function changeMode(next: "password" | "email-code") {
    setMode(next);
    setError("");
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="text-center">
        <LangToggle lang={lang} choose={choose} />
        <CardTitle className="text-2xl font-display">{t.loginTitle}</CardTitle>
        <CardDescription>{t.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
        {magic?.enabled && magic.waUrl ? (
          <>
            <Button asChild type="button" className="auth-whatsapp w-full" size="lg">
              <a href={magic.waUrl} target="_blank" rel="noreferrer">
                <WhatsAppIcon />
                {t.continueWhatsApp}
              </a>
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span>{t.orSignInWithEmail}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        ) : null}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          <Button type="button" variant={mode === "password" ? "default" : "ghost"} onClick={() => changeMode("password")}>
            {t.passwordMode}
          </Button>
          <Button type="button" variant={mode === "email-code" ? "default" : "ghost"} onClick={() => changeMode("email-code")}>
            {t.emailCodeMode}
          </Button>
        </div>
        <form onSubmit={mode === "password" ? signInWithPassword : codeSent ? signInWithEmailCode : sendEmailCode} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setCodeSent(false);
                setCode("");
              }}
              placeholder="you@business.com"
              className="h-11"
            />
          </div>
          {mode === "password" ? <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label htmlFor="password">{t.password}</Label>
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
          </div> : null}
          {mode === "email-code" && codeSent ? (
            <div className="space-y-2">
              <OtpCodeField id="email-otp-code" label={t.emailCodeLabel} value={code} onChange={setCode} />
              <button
                type="button"
                className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                disabled={loading || resendLeft > 0}
                onClick={() => void sendEmailCode()}
              >
                {resendLeft > 0 ? t.resendEmailIn(resendLeft) : t.resendEmailCode}
              </button>
              <button
                type="button"
                className="ml-4 text-sm text-primary hover:underline"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                }}
              >
                {t.changeEmail}
              </button>
            </div>
          ) : null}
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={loading || (mode === "email-code" && codeSent && code.length !== 6)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {mode === "password" ? t.signIn : codeSent ? t.verifyEmailCode : t.sendEmailCode}
          </Button>
        </form>
        <div className="text-center text-sm text-muted-foreground">
          New to QR24x7?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </div>
        {process.env.NODE_ENV !== "production" ? (
          <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
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
