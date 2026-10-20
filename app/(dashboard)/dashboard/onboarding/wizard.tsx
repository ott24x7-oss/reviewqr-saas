"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";

const COLORS = ["#1a73e8", "#0f766e", "#b45309", "#be123c", "#111827"];
const STORAGE_KEY = "rq-onboarding";

type Draft = {
  step: number;
  name: string;
  industry: string;
  city: string;
  address: string;
  phone: string;
  googlePlaceId: string;
  googleReviewUrl: string;
  logo: string | null;
  primaryColor: string;
};

const empty: Draft = {
  step: 1,
  name: "",
  industry: "",
  city: "",
  address: "",
  phone: "",
  googlePlaceId: "",
  googleReviewUrl: "",
  logo: null,
  primaryColor: COLORS[0],
};

type Prediction = { placeId: string; description: string };
type Done = { businessId: string; name: string; shortCode: string };

export function OnboardingWizard({
  placesEnabled,
  orderHref
}: {
  placesEnabled: boolean;
  orderHref: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft>(empty);
  const [predictions, setPredictions] = React.useState<Prediction[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<Done | null>(null);

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setDraft({ ...empty, ...JSON.parse(saved) });
    } catch {
      /* ignore a bad draft */
    }
  }, []);

  React.useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function searchPlaces(query: string) {
    update("name", query);
    if (!placesEnabled || query.trim().length < 2) {
      setPredictions([]);
      return;
    }
    const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
    const json = await res.json().catch(() => ({}));
    setPredictions(Array.isArray(json.predictions) ? json.predictions : []);
  }

  async function pickPlace(placeId: string) {
    setPredictions([]);
    const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.place) {
      toast.error(json.error || "Could not load that place");
      return;
    }
    setDraft((current) => ({
      ...current,
      name: json.place.name || current.name,
      address: json.place.address || "",
      phone: json.place.phone || "",
      city: json.place.city || "",
      googlePlaceId: json.place.googlePlaceId,
      googleReviewUrl: json.place.googleReviewUrl
    }));
  }

  async function skip() {
    await fetch("/api/onboarding/skip", { method: "POST" });
    router.push("/dashboard");
    router.refresh();
  }

  async function finish() {
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not create the business");
      sessionStorage.removeItem(STORAGE_KEY);
      setDone(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the business");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const qrPng = `/api/qr/${done.shortCode}/image?format=png`;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your QR is ready</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Short link: <span className="font-mono text-foreground">/q/{done.shortCode}</span>
          </p>
          <img src={qrPng} alt="QR code" className="h-48 w-48 rounded-xl border" />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="gradient">
              <a href={orderHref || "/"}>{orderHref ? "Order your printed QR/NFC" : "Contact us to order a printed QR"}</a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/dashboard/businesses/${done.businessId}`}>Open business</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Set up your business</h1>
          <p className="text-sm text-muted-foreground">Step {draft.step} of 2. You can skip and come back.</p>
        </div>
        <Button type="button" variant="outline" onClick={skip}>
          Skip
        </Button>
      </div>

      {draft.step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={draft.name} onChange={(e) => searchPlaces(e.target.value)} />
              {predictions.length > 0 && (
                <div className="rounded-lg border bg-white dark:bg-slate-900">
                  {predictions.map((row) => (
                    <button
                      key={row.placeId}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                      onClick={() => pickPlace(row.placeId)}
                    >
                      {row.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="industry">Category</Label>
                <Input id="industry" value={draft.industry} onChange={(e) => update("industry", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={draft.city} onChange={(e) => update("city", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={draft.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={draft.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="google">Google review link</Label>
              <Input
                id="google"
                value={draft.googleReviewUrl}
                onChange={(e) => update("googleReviewUrl", e.target.value)}
                placeholder="https://search.google.com/local/writereview?placeid=..."
              />
            </div>
            <Button type="button" onClick={() => update("step", 2)} disabled={draft.name.trim().length < 2}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {draft.step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Logo and colour</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload variant="logo" value={draft.logo} onChange={(logo) => update("logo", logo)} label="Logo" />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => update("primaryColor", color)}
                  className="h-9 w-9 rounded-full border-2"
                  style={{
                    background: color,
                    borderColor: draft.primaryColor === color ? "#111" : "transparent"
                  }}
                />
              ))}
              <Input
                value={draft.primaryColor}
                onChange={(e) => update("primaryColor", e.target.value)}
                className="w-32 font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => update("step", 1)}>
                Back
              </Button>
              <Button type="button" onClick={finish} disabled={busy}>
                {busy ? "Creating…" : "Create business and QR"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
