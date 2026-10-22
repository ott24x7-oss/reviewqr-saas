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
import {
  channelLine,
  LangToggle,
  OtpCodeField,
  useAuthLang,
  useResendCountdown,
  WhatsAppIcon
} from "@/components/auth/otp-ui";

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

export default function RegisterPage() {
  const router = useRouter();
  const { lang, choose, t } = useAuthLang();
  const [method, setMethod] = React.useState<"whatsapp" | "email">("whatsapp");
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    password: ""
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [step, setStep] = React.useState<"phone" | "code" | "business">("phone");
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [signupToken, setSignupToken] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [channel, setChannel] = React.useState<string | undefined>();
  const [resendAfter, setResendAfter] = React.useState(30);
  const left = useResendCountdown(step === "code", resendAfter);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Registration failed");
        setError(json.error || "Registration failed");
        setLoading(false);
        return;
      }
      const entered = await enterSession(
        { email: form.email.trim().toLowerCase(), password: form.password },
        "/dashboard"
      );
      if (!entered.ok) {
        toast.error("Account created — please log in");
        router.push("/login");
        return;
      }
      toast.success("Welcome to ReviewQR!");
      window.location.assign(planCheckoutPath() || entered.path);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function sendCode() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request", phone })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send a code");
      setStep("code");
      setCode("");
      setChannel(json.channel);
      setResendAfter(typeof json.resendAfterSec === "number" ? json.resendAfterSec : 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "confirm", phone, code })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Invalid code");
      setSignupToken(json.signupToken);
      setStep("business");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function finish(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "finish",
          phone,
          signupToken,
          name: ownerName,
          businessName
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not create the account");
      const entered = await enterSession(
        {
          otpToken: String(json.otpToken || ""),
          email: "otp-login@invalid.local",
          password: "unused"
        },
        planCheckoutPath() || "/dashboard/onboarding"
      );
      if (!entered.ok) throw new Error("Account created — please sign in");
      window.location.assign(entered.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="text-center">
        <LangToggle lang={lang} choose={choose} />
        <CardTitle className="text-2xl font-display">
          {method === "whatsapp" ? t.registerTitle : "Start your free trial"}
        </CardTitle>
        <CardDescription>
          {method === "whatsapp" ? t.registerSubtitle : "14 days free · no credit card needed"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {method === "whatsapp" ? (
          <form
            className="space-y-4"
            onSubmit={step === "code" ? confirmCode : step === "business" ? finish : (event) => { event.preventDefault(); void sendCode(); }}
          >
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            {step === "phone" ? (
              <div className="space-y-1.5">
                <Label htmlFor="wa-phone">{t.phone}</Label>
                <Input
                  id="wa-phone"
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
            ) : null}
            {step === "code" ? (
              <>
                <p className="text-sm">{channelLine(channel, t)}</p>
                <OtpCodeField id="wa-code" label={t.code} value={code} onChange={setCode} />
              </>
            ) : null}
            {step === "business" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="wa-name">{t.name}</Label>
                  <Input id="wa-name" required minLength={2} value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wa-business">{t.business}</Label>
                  <Input id="wa-business" required minLength={2} value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="h-11" />
                </div>
              </>
            ) : null}
            <Button
              type="submit"
              className="auth-whatsapp w-full"
              disabled={loading || (step === "code" && code.length !== 6)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon />}
              {step === "phone" ? t.sendRegister : step === "code" ? t.verifyRegister : t.finish}
            </Button>
            {step === "code" ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <button type="button" onClick={() => { setStep("phone"); setCode(""); setError(""); }}>
                  {t.change}
                </button>
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
          <form onSubmit={onSubmit} className="space-y-3.5">
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Rakesh Sharma"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="98xxxxxxxx"
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(event) => update("businessName", event.target.value)}
                placeholder="Spice Junction Café"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="you@business.com"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <PasswordField
                id="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(value) => update("password", value)}
                placeholder="At least 8 characters"
              />
              <p className="text-xs text-muted-foreground">Min 8 chars, 1 uppercase, 1 number</p>
            </div>
            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create account
            </Button>
            <ul className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-accent" /> 14-day free trial of Growth plan
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-accent" /> No credit card required to start
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-accent" /> Cancel anytime, downgrade to Free
              </li>
            </ul>
            <button type="button" className="w-full text-sm" onClick={() => { setMethod("whatsapp"); setError(""); }}>
              {t.whatsappInstead}
            </button>
          </form>
        )}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
