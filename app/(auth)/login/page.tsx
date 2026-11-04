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
  OtpCodeField,
  useAuthLang,
  useResendCountdown,
  WhatsAppIcon
} from "@/components/auth/otp-ui";

type MagicConfig = { enabled: boolean; waUrl: string };

function LoginForm() {
  const search = useSearchParams();
  const { t } = useAuthLang();
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
    if (search.get("verified") === "1") toast.success(t.emailConfirmed);
    if (search.get("verify") === "failed") toast.error(t.confirmationExpired);
  }, [search, t]);

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
      setError(t.invalidCredentials);
      toast.error(t.invalidCredentials);
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
      if (!response.ok) throw new Error(t.requestEmailCodeFailed);
      setCodeSent(true);
      setCode("");
      setResendCycle((value) => value + 1);
      toast.success(t.sentEmailCode);
    } catch {
      setError(t.requestEmailCodeFailed);
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
      if (!response.ok || !json?.data?.otpToken) throw new Error(t.verifyEmailCodeFailed);
      const entered = await enterSession({ otpToken: String(json.data.otpToken) }, search.get("callbackUrl") || json.data.path);
      if (!entered.ok) throw new Error(t.verifyEmailCodeFailed);
      toast.success(t.welcomeBack);
      window.location.assign(entered.path);
    } catch {
      setError(t.verifyEmailCodeFailed);
    } finally {
      setLoading(false);
    }
  }

  function changeMode(next: "password" | "email-code") {
    setMode(next);
    setError("");
  }

  function moveTab(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "password" : event.key === "End" ? "email-code" : mode === "password" ? "email-code" : "password";
    changeMode(next);
    window.requestAnimationFrame(() => document.getElementById(`login-tab-${next}`)?.focus());
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="auth-card-header">
        <CardTitle className="text-2xl font-display">{t.loginTitle}</CardTitle>
        <CardDescription>{t.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="auth-card-content space-y-6">
        {magic?.enabled && magic.waUrl ? (
          <>
            <Button asChild type="button" className="auth-whatsapp w-full" size="lg">
              <a href={magic.waUrl} target="_blank" rel="noreferrer">
                <WhatsAppIcon />
                {t.continueWhatsApp}
              </a>
            </Button>
            <div className="auth-divider" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span>{t.orUseEmail}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        ) : null}
        <div className="auth-segmented" role="tablist" aria-label={t.loginMethod}>
          <Button
            id="login-tab-password"
            type="button"
            role="tab"
            aria-selected={mode === "password"}
            aria-controls="login-panel"
            tabIndex={mode === "password" ? 0 : -1}
            className="auth-mode-tab"
            onKeyDown={moveTab}
            onClick={() => changeMode("password")}
          >
            {t.passwordMode}
          </Button>
          <Button
            id="login-tab-email-code"
            type="button"
            role="tab"
            aria-selected={mode === "email-code"}
            aria-controls="login-panel"
            tabIndex={mode === "email-code" ? 0 : -1}
            className="auth-mode-tab"
            onKeyDown={moveTab}
            onClick={() => changeMode("email-code")}
          >
            {t.emailCodeMode}
          </Button>
        </div>
        <div id="login-panel" role="tabpanel" aria-labelledby={`login-tab-${mode}`} tabIndex={0}>
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
                placeholder={t.emailPlaceholder}
                className="h-11"
              />
            </div>
            {mode === "password" ? <div className="space-y-1.5">
              <div className="auth-label-row">
                <Label htmlFor="password">{t.password}</Label>
                <Link href="/forgot-password" className="auth-forgot-link">
                  {t.forgot}
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
                <div className="auth-inline-actions">
                  <button
                    type="button"
                    className="auth-text-button"
                    disabled={loading || resendLeft > 0}
                    onClick={() => void sendEmailCode()}
                  >
                    {resendLeft > 0 ? t.resendEmailIn(resendLeft) : t.resendEmailCode}
                  </button>
                  <button
                    type="button"
                    className="auth-text-button"
                    onClick={() => {
                      setCodeSent(false);
                      setCode("");
                    }}
                  >
                    {t.changeEmail}
                  </button>
                </div>
              </div>
            ) : null}
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            <Button
              type="submit"
              size="lg"
              className="auth-primary-button w-full"
              disabled={loading || (mode === "email-code" && codeSent && code.length !== 6)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
              {mode === "password" ? t.signIn : codeSent ? t.verifyEmailCode : t.sendEmailCode}
            </Button>
          </form>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          {t.newTo}{" "}
          <Link href="/register" className="auth-link-emphasis">
            {t.createAccount}
          </Link>
        </div>
        {process.env.NODE_ENV !== "production" ? (
          <div className="auth-demo-hint">
            <strong>{t.demo}:</strong> demo@reviewqr.in / Demo@123
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
