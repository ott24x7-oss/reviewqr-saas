"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JoinConfirmPage() {
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/agent/onboard/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, code, name })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not confirm");
      return;
    }
    setMessage("Confirmed. Sign in with WhatsApp to open the dashboard.");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Confirm your business</h1>
      <p className="mt-2 text-sm text-muted-foreground">Enter the WhatsApp code your agent sent.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <div>
          <Label htmlFor="phone">Mobile</Label>
          <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="code">Code</Label>
          <Input id="code" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required />
        </div>
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <Button type="submit">Confirm</Button>
      </form>
    </main>
  );
}
