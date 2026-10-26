"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AgentProfileView } from "@reviewqr/shared";

export function ProfileForm({ initial }: { initial: AgentProfileView }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: initial.name,
    city: initial.city,
    upiId: initial.upiId,
    pan: initial.pan,
    bankAccount: "",
    bankIfsc: "",
    bankName: ""
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const body: Record<string, string> = { name: form.name, city: form.city, upiId: form.upiId };
    if (form.pan && !form.pan.includes("•")) body.pan = form.pan;
    if (form.bankAccount.trim()) body.bankAccount = form.bankAccount.trim();
    if (form.bankIfsc.trim()) body.bankIfsc = form.bankIfsc.trim();
    if (form.bankName.trim()) body.bankName = form.bankName.trim();
    const res = await fetch("/api/v1/agent/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error?.message || "Could not save the profile");
      return;
    }
    toast.success("Profile saved");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid max-w-lg gap-3">
      <div>
        <Label htmlFor="profile-name">Name</Label>
        <Input id="profile-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </div>
      <div>
        <Label htmlFor="profile-city">City</Label>
        <Input id="profile-city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
      </div>
      <div>
        <Label htmlFor="profile-upi">UPI ID</Label>
        <Input id="profile-upi" value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} />
      </div>
      <div>
        <Label htmlFor="profile-pan">PAN</Label>
        <Input id="profile-pan" value={form.pan} onChange={(event) => setForm({ ...form, pan: event.target.value.toUpperCase() })} autoComplete="off" />
      </div>
      <div>
        <Label htmlFor="profile-bank">Bank account</Label>
        <Input
          id="profile-bank"
          value={form.bankAccount}
          placeholder={initial.bankLast4 ? `Ending ${initial.bankLast4}` : "Optional"}
          onChange={(event) => setForm({ ...form, bankAccount: event.target.value })}
          autoComplete="off"
        />
      </div>
      <div>
        <Label htmlFor="profile-ifsc">IFSC</Label>
        <Input id="profile-ifsc" value={form.bankIfsc} onChange={(event) => setForm({ ...form, bankIfsc: event.target.value.toUpperCase() })} />
      </div>
      <div>
        <Label htmlFor="profile-bank-name">Account name</Label>
        <Input id="profile-bank-name" value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} />
      </div>
      <Button type="submit">Save profile</Button>
    </form>
  );
}
