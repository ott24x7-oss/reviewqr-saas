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

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [phone, setPhone] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpLoading, setOtpLoading] = React.useState(false);

  React.useEffect(() => {
    if (search.get("verified") === "1") toast.success("Email confirmed. You can sign in.");
    if (search.get("verify") === "failed") toast.error("That confirmation link is invalid or expired.");
  }, [search]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password");
      return;
    }
    toast.success("Welcome back!");
    router.push(search.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display">Welcome back</CardTitle>
        <CardDescription>Sign in to manage your reviews</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
        <div className="my-6 border-t pt-5 space-y-3">
          <p className="text-sm font-medium">Sign in with mobile OTP</p>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98xxxxxxxx"
              className="h-11"
            />
          </div>
          {otpSent && (
            <div className="space-y-1.5">
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="000000"
                className="h-11"
              />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={otpLoading}
            onClick={async () => {
              setOtpLoading(true);
              try {
                if (!otpSent) {
                  const res = await fetch("/api/auth/otp/request", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ phone })
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(json.error || "Could not send the code");
                  setOtpSent(true);
                  toast.success("If this number has an account, a code is on the way");
                } else {
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
                }
              } catch (e: any) {
                toast.error(e.message || "Something went wrong");
              } finally {
                setOtpLoading(false);
              }
            }}
          >
            {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {otpSent ? "Verify code" : "Send code"}
          </Button>
        </div>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          New to ReviewQR?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </div>
        {process.env.NODE_ENV !== "production" ? (
          <div className="mt-4 p-3 rounded-lg bg-secondary text-xs text-muted-foreground">
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
