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
import { LangToggle, useAuthLang, WhatsAppIcon } from "@/components/auth/otp-ui";

type MagicConfig = { enabled: boolean; waUrl: string };

function LoginForm() {
  const search = useSearchParams();
  const { lang, choose, t } = useAuthLang();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [magic, setMagic] = React.useState<MagicConfig | null>(null);

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
    toast.success("Welcome back!");
    window.location.assign(entered.path);
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
                Continue with WhatsApp
              </a>
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span>or sign in with email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        ) : null}
        <form onSubmit={signInWithPassword} className="space-y-4">
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
