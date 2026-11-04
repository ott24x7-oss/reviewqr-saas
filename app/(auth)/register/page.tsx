"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enterSession } from "@/components/auth/enter-session";
import { Loader2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/brand/password-field";
import { useAuthLang, WhatsAppIcon } from "@/components/auth/otp-ui";

type MagicConfig = { enabled: boolean; signupWaUrl: string };

function planCheckoutPath() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan");
  if (!plan) return null;
  const next = new URLSearchParams({ plan });
  const duration = params.get("duration");
  if (duration) next.set("duration", duration);
  return `/dashboard/billing?${next.toString()}`;
}

function referralCodeFromUrl() {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("ref")?.trim() || undefined;
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useAuthLang();
  const [method, setMethod] = React.useState<"whatsapp" | "email">("whatsapp");
  const [magic, setMagic] = React.useState<MagicConfig | null>(null);
  const [configReady, setConfigReady] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", businessName: "", password: "" });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [signupPhone, setSignupPhone] = React.useState("");
  const [signupProof, setSignupProof] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const claimStarted = React.useRef(false);

  React.useEffect(() => {
    let live = true;
    const requestedEmailSignup = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("method") === "email";
    if (requestedEmailSignup) setMethod("email");
    fetch("/api/v1/auth/magic/config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (!live) return;
        if (config && typeof config.enabled === "boolean" && typeof config.signupWaUrl === "string") {
          setMagic(config);
          if (!config.enabled && !requestedEmailSignup && !claimStarted.current) setMethod("email");
        } else if (!requestedEmailSignup) {
          if (!claimStarted.current) setMethod("email");
        }
        setConfigReady(true);
      })
      .catch(() => {
        if (!live) return;
        setConfigReady(true);
        if (!requestedEmailSignup && !claimStarted.current) setMethod("email");
      });
    return () => { live = false; };
  }, []);

  React.useEffect(() => {
    if (claimStarted.current || typeof window === "undefined") return;
    const signup = new URLSearchParams(window.location.search).get("signup");
    if (!signup) return;
    claimStarted.current = true;
    setLoading(true);
    setError("");
    fetch("/api/v1/auth/signup/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signupToken: signup })
    })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json.data?.phone || !json.data?.signupToken) {
          throw new Error(json.error?.message || t.signupLinkInvalid);
        }
        setSignupPhone(String(json.data.phone));
        setSignupProof(String(json.data.signupToken));
        setMethod("whatsapp");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : t.signupLinkInvalid))
      .finally(() => setLoading(false));
  }, [t.signupLinkInvalid]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error(t.registrationRequired);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, referralCode: referralCodeFromUrl() })
      });
      if (!res.ok) {
        toast.error(t.registrationFailed);
        setError(t.registrationFailed);
        return;
      }
      const entered = await enterSession(
        { email: form.email.trim().toLowerCase(), password: form.password },
        planCheckoutPath() || "/dashboard"
      );
      if (!entered.ok) {
        toast.error(t.accountCreatedLogin);
        router.push("/login");
        return;
      }
      toast.success(t.welcome);
      window.location.assign(entered.path);
    } catch {
      toast.error(t.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  async function finishWhatsappSignup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "finish",
          phone: signupPhone,
          signupToken: signupProof,
          name: ownerName,
          businessName,
          referralCode: referralCodeFromUrl()
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t.createAccountFailed);
      const entered = await enterSession(
        { otpToken: String(json.otpToken || ""), email: "otp-login@invalid.local", password: "unused" },
        planCheckoutPath() || "/dashboard/onboarding"
      );
      if (!entered.ok) throw new Error(t.accountCreatedLogin);
      window.location.assign(entered.path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.createAccountFailed);
    } finally {
      setLoading(false);
    }
  }

  const whatsappClaimed = !!signupProof;
  const whatsappFlow = method === "whatsapp" && (whatsappClaimed || (!!magic?.enabled && !!magic.signupWaUrl));

  return (
    <Card className="shadow-card">
      <CardHeader className="auth-card-header">
        <CardTitle className="text-2xl font-display">
          {whatsappFlow ? t.registerTitle : t.startTrialTitle}
        </CardTitle>
        <CardDescription>
          {whatsappFlow ? t.registerSubtitle : t.startTrialSubtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="auth-card-content">
        {whatsappFlow ? whatsappClaimed ? (
          <form className="space-y-4" onSubmit={finishWhatsappSignup}>
            <div className="space-y-1.5">
              <Label htmlFor="verified-phone">{t.verifiedPhone}</Label>
              <Input id="verified-phone" type="tel" value={signupPhone} readOnly className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-name">{t.name}</Label>
              <Input id="wa-name" required minLength={2} value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-business">{t.business}</Label>
              <Input id="wa-business" required minLength={2} value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="h-11" />
            </div>
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            <Button type="submit" className="auth-whatsapp w-full" disabled={loading || ownerName.trim().length < 2 || businessName.trim().length < 2}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon />}
              {t.finish}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.messageBotToSignup}</p>
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            <Button
              type="button"
              className="auth-whatsapp w-full"
              disabled={!configReady || loading || !magic?.signupWaUrl}
              onClick={() => { if (magic?.signupWaUrl) window.location.assign(magic.signupWaUrl); }}
            >
              {loading || !configReady ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon />}
              {t.signupWithWhatsApp}
            </Button>
            <button type="button" className="auth-method-switch" onClick={() => { setMethod("email"); setError(""); }}>
              {t.continueWithEmail}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t.yourNameRequired}</Label>
                <Input id="name" required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder={t.namePlaceholder} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t.mobile}</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder={t.phonePlaceholder} className="h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessName">{t.business}</Label>
              <Input id="businessName" value={form.businessName} onChange={(event) => update("businessName", event.target.value)} placeholder={t.businessPlaceholder} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.emailRequired}</Label>
              <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => update("email", event.target.value)} placeholder={t.emailPlaceholder} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.passwordRequired}</Label>
              <PasswordField id="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(value) => update("password", value)} placeholder={t.passwordHint} />
              <p className="auth-field-hint">{t.passwordRequirement}</p>
            </div>
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            <Button type="submit" size="lg" className="auth-primary-button w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {t.createAccount}
            </Button>
            <ul className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> {t.trialBenefit}</li>
              <li className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> {t.noCardBenefit}</li>
              <li className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> {t.freePlanBenefit}</li>
            </ul>
            {magic?.enabled && magic.signupWaUrl ? (
              <button type="button" className="auth-method-switch" onClick={() => { setMethod("whatsapp"); setError(""); }}>
                {t.signupWithWhatsApp}
              </button>
            ) : null}
          </form>
        )}
        <div className="auth-form-footer text-center text-sm text-muted-foreground">
          {t.alreadyHaveAccount}{" "}
          <Link href="/login" className="auth-link-emphasis">{t.signIn}</Link>
        </div>
      </CardContent>
    </Card>
  );
}
