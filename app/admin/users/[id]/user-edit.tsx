"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Save, KeyRound } from "lucide-react";

type Props = {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
    subscriptionEndsAt: string | null;
  };
};

function dateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function UserEditForm({ user }: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: user.name || "",
    phone: user.phone || "",
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    trialEndsAt: dateInputValue(user.trialEndsAt),
    subscriptionEndsAt: dateInputValue(user.subscriptionEndsAt),
    newPassword: ""
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: any = {
        name: form.name || null,
        phone: form.phone || null,
        role: form.role,
        subscriptionTier: form.subscriptionTier,
        subscriptionStatus: form.subscriptionStatus,
        trialEndsAt: form.trialEndsAt ? new Date(form.trialEndsAt).toISOString() : null,
        subscriptionEndsAt: form.subscriptionEndsAt
          ? new Date(form.subscriptionEndsAt).toISOString()
          : null
      };
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Update failed");
      toast.success("User updated");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!form.newPassword || form.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: form.newPassword })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Reset failed");
      toast.success("Password reset — share it with the user securely");
      update("newPassword", "");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setResetting(false);
    }
  }

  async function deleteUser() {
    if (!confirm(`Delete ${user.email}? This removes all their businesses, reviews, and payments.`))
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Delete failed");
      toast.success("User deleted");
      router.push("/admin/users");
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    }
  }

  function extendBy(days: number) {
    const base = form.subscriptionEndsAt ? new Date(form.subscriptionEndsAt) : new Date();
    base.setDate(base.getDate() + days);
    update("subscriptionEndsAt", base.toISOString().slice(0, 10));
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Edit user</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-surface/70 text-ink px-3 text-sm"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="AGENCY">AGENCY</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>
          <div>
            <Label>Plan tier</Label>
            <select
              value={form.subscriptionTier}
              onChange={(e) => update("subscriptionTier", e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-surface/70 text-ink px-3 text-sm"
            >
              <option value="FREE">FREE</option>
              <option value="STARTER">STARTER</option>
              <option value="GROWTH">GROWTH</option>
              <option value="AGENCY">AGENCY</option>
            </select>
          </div>
          <div>
            <Label>Subscription status</Label>
            <select
              value={form.subscriptionStatus}
              onChange={(e) => update("subscriptionStatus", e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-surface/70 text-ink px-3 text-sm"
            >
              <option value="TRIALING">TRIALING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAST_DUE">PAST_DUE</option>
              <option value="CANCELED">CANCELED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>
          <div>
            <Label>Trial ends</Label>
            <Input
              type="date"
              value={form.trialEndsAt}
              onChange={(e) => update("trialEndsAt", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Subscription renews</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={form.subscriptionEndsAt}
                onChange={(e) => update("subscriptionEndsAt", e.target.value)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => extendBy(30)}>
                +30d
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => extendBy(365)}>
                +1y
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>

        <div className="border-t border-border pt-4">
          <Label className="text-xs">Reset password</Label>
          <div className="flex gap-2 mt-1">
            <Input
              type="text"
              placeholder="New password (min 8 chars)"
              value={form.newPassword}
              onChange={(e) => update("newPassword", e.target.value)}
            />
            <Button onClick={resetPassword} disabled={resetting} variant="outline">
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Reset
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <Button onClick={deleteUser} disabled={deleting} variant="destructive">
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete user
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
