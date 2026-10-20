"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/brand/password-field";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    password: ""
  });
  const [loading, setLoading] = React.useState(false);
  const [otpOpen, setOtpOpen] = React.useState(false);
  const [otpSent, setOtpSent] = React.useState(false);
  const [otp, setOtp] = React.useState({ name: "", phone: "", email: "", code: "" });

  function update<K extends keyof typeof form>(key: K, v: string) {
    setForm((s) => ({ ...s, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Registration failed");
        setLoading(false);
        return;
      }
      const sign = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false
      });
      if (sign?.error) {
        toast.error("Account created — please log in");
        router.push("/login");
        return;
      }
      toast.success("Welcome to ReviewQR!");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display">Start your free trial</CardTitle>
        <CardDescription>14 days free · no credit card needed</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
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
                onChange={(e) => update("phone", e.target.value)}
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
              onChange={(e) => update("businessName", e.target.value)}
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
              onChange={(e) => update("email", e.target.value)}
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
        </form>
        {!otpOpen ? (
          <Button type="button" variant="outline" className="mt-4 min-h-[44px] w-full" onClick={() => setOtpOpen(true)}>
            Sign up with mobile
          </Button>
        ) : (
          <form
            className="mt-4 space-y-3 border-t pt-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setLoading(true);
              try {
                if (!otpSent) {
                  const res = await fetch("/api/auth/otp/signup", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ action: "request", phone: otp.phone, email: otp.email })
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(json.error || "Could not send a code");
                  setOtpSent(true);
                  toast.success("Code sent");
                  return;
                }
                const res = await fetch("/api/auth/otp/signup", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "verify", phone: otp.phone, email: otp.email, name: otp.name, code: otp.code })
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json.error || "Could not create the account");
                const sign = await signIn("credentials", { otpToken: json.otpToken, redirect: false });
                if (sign?.error) throw new Error("Account created — please sign in");
                router.push("/dashboard/onboarding");
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not sign up");
              } finally {
                setLoading(false);
              }
            }}
          >
            <p className="text-sm font-medium">Sign up with mobile OTP</p>
            <label className="block space-y-1 text-sm">
              <span>Full name</span>
              <Input className="h-11" value={otp.name} onChange={(event) => setOtp((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Mobile number</span>
              <Input className="h-11" value={otp.phone} onChange={(event) => setOtp((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Contact address</span>
              <Input className="h-11" value={otp.email} onChange={(event) => setOtp((current) => ({ ...current, email: event.target.value }))} />
            </label>
            {otpSent ? (
              <label className="block space-y-1 text-sm">
                <span>6-digit code</span>
                <Input className="h-11" inputMode="numeric" value={otp.code} onChange={(event) => setOtp((current) => ({ ...current, code: event.target.value }))} />
              </label>
            ) : null}
            <Button type="submit" variant="outline" className="min-h-[44px] w-full" disabled={loading}>
              {otpSent ? "Verify and continue" : "Send code"}
            </Button>
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
