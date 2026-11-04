"use client";
import * as React from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthLang } from "@/components/auth/otp-ui";

export default function ForgotPasswordPage() {
  const { t } = useAuthLang();
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError(t.forgotRequestFailed);
        toast.error(t.forgotRequestFailed);
      }
    } catch {
      setError(t.forgotRequestFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="auth-card-header">
        <CardTitle className="text-2xl font-display">{t.loginTitleForgot}</CardTitle>
        <CardDescription>
          {sent
            ? t.forgotSentDescription
            : t.forgotDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="auth-card-content">
        {!sent ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="h-11"
              />
            </div>
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            <Button type="submit" size="lg" className="auth-primary-button w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {t.sendResetLink}
            </Button>
          </form>
        ) : (
          <div className="auth-success-message" role="status">
            {t.inboxCheck} <b>{email}</b>. {t.linkExpires}
          </div>
        )}
        <div className="auth-form-footer text-center text-sm text-muted-foreground">
          <Link href="/login" className="auth-link-emphasis">
            ← {t.backToLogin}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
