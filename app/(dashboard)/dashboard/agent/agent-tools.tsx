"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AgentTools({ link, shareText, qr }: { link: string; shareText: string; qr: string }) {
  const [phone, setPhone] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");

  async function onboard(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/agent/onboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, businessName })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not send the code");
      return;
    }
    toast.success(json.devCode ? `Code ${json.devCode}` : "WhatsApp code sent. The owner confirms it on /join/confirm");
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  return (
    <section className="grid gap-4 lg:grid-cols-[200px_1fr]">
      <img src={qr} alt="Join QR" className="h-48 w-48 rounded-xl border bg-white p-2" />
      <div className="space-y-3">
        <p className="break-all text-sm">{link}</p>
        <a className="inline-flex h-10 items-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white" href={whatsapp} target="_blank" rel="noreferrer">
          Share on WhatsApp
        </a>
        <form onSubmit={onboard} className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="onboard-phone">Owner mobile</Label>
            <Input id="onboard-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="onboard-business">Business name</Label>
            <Input id="onboard-business" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required />
          </div>
          <Button type="submit">Send confirmation code</Button>
        </form>
      </div>
    </section>
  );
}
