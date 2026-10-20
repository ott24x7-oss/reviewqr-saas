"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountPrivacy() {
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState<"export" | "delete" | null>(null);

  async function download() {
    setBusy("export");
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reviewqr-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function erase() {
    if (confirm !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    setBusy("delete");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not delete the account");
      toast.success("Account deleted");
      await signOut({ callbackUrl: "/" });
    } catch (e: any) {
      toast.error(e.message || "Could not delete the account");
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download a copy of your account, businesses, reviews, and feedback. Deleting the account
          removes those businesses and your profile. Tax invoices are kept, as described in the{" "}
          <a href="/privacy" className="underline">
            privacy notice
          </a>
          .
        </p>
        <Button type="button" variant="outline" onClick={download} disabled={busy !== null}>
          {busy === "export" ? "Preparing…" : "Download my data"}
        </Button>
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="delete-confirm">Delete account</Label>
          <Input
            id="delete-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type DELETE"
            autoComplete="off"
          />
          <Button type="button" variant="outline" onClick={erase} disabled={busy !== null}>
            {busy === "delete" ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
