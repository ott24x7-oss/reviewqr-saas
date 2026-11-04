"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/brand/password-field";
import { useAuthLang } from "@/components/auth/otp-ui";

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { t } = useAuthLang();
  const token = search.get("token") || "";
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      if (!res.ok) throw new Error(t.resetFailed);
      toast.success(t.passwordUpdated);
      router.push("/login");
    } catch {
      setError(t.resetFailed);
      toast.error(t.resetFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="auth-card-header">
        <CardTitle className="text-2xl font-display">{t.resetTitle}</CardTitle>
        <CardDescription>{t.resetDescription}</CardDescription>
      </CardHeader>
      <CardContent className="auth-card-content">
        {!token ? (
          <p className="text-sm text-muted-foreground">
            {t.missingToken}{" "}
            <Link href="/forgot-password" className="auth-link-emphasis">
              {t.requestNewLink}
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.newPassword}</Label>
              <PasswordField
                id="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={setPassword}
              />
            </div>
            {error ? <p role="alert" className="auth-error text-sm">{error}</p> : null}
            <Button type="submit" size="lg" className="auth-primary-button w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.updatePassword}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetForm />
    </React.Suspense>
  );
}
