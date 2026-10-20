"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeScan } from "@/components/dashboard/code-scan";
import { codeFromScan } from "@/lib/tap/qr-stock";

const STORAGE_KEY = "rq-onboarding";
const CATEGORIES = ["Café", "Restaurant", "Salon", "Shop", "Other"];

type Existing = {
  id: string;
  name: string;
  industry: string | null;
  whatsappNumber: string | null;
  googleReviewUrl: string | null;
} | null;

type Draft = {
  step: number;
  businessId: string;
  name: string;
  industry: string;
  code: string;
  digitalCode: string;
  itemName: string;
  itemPrice: string;
  items: string[];
  whatsapp: string;
  waCode: string;
  waVerified: boolean;
  google: string;
  justdial: string;
  zomato: string;
  trustpilot: string;
  facebook: string;
  custom: string;
};

const empty: Draft = {
  step: 1,
  businessId: "",
  name: "",
  industry: "Café",
  code: "",
  digitalCode: "",
  itemName: "",
  itemPrice: "",
  items: [],
  whatsapp: "",
  waCode: "",
  waVerified: false,
  google: "",
  justdial: "",
  zomato: "",
  trustpilot: "",
  facebook: "",
  custom: ""
};

export function OnboardingWizard({ existing }: { existing: Existing }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft>(empty);
  const [ready, setReady] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [claimMessage, setClaimMessage] = React.useState("");
  const [claimReady, setClaimReady] = React.useState(false);

  React.useEffect(() => {
    let next = empty;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) next = { ...empty, ...JSON.parse(saved), items: [] };
    } catch {
      /* ignore a bad draft */
    }
    if (existing) {
      const same = next.businessId === existing.id;
      next = {
        ...(same ? next : empty),
        businessId: existing.id,
        name: (same && next.name) || existing.name,
        industry: (same && next.industry) || existing.industry || "Café",
        whatsapp: (same && next.whatsapp) || existing.whatsappNumber || "",
        google: (same && next.google) || existing.googleReviewUrl || "",
        step: same && next.step > 1 ? next.step : 2
      };
    }
    setDraft(next);
    setReady(true);
  }, [existing]);

  React.useEffect(() => {
    if (ready) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, ready]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function skip() {
    await fetch("/api/onboarding/skip", { method: "POST" });
    router.push("/dashboard");
    router.refresh();
  }

  async function createBusiness() {
    if (draft.businessId) {
      update("step", 2);
      return;
    }
    if (draft.name.trim().length < 2) {
      toast.error("Enter the business name");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: draft.name.trim(), industry: draft.industry, primaryColor: "#1a73e8" })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not create the business");
      setDraft((current) => ({ ...current, businessId: json.businessId, step: 2 }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the business");
    } finally {
      setBusy(false);
    }
  }

  async function claim(confirm: boolean) {
    const code = codeFromScan(draft.code);
    if (!code || !draft.businessId) {
      toast.error("Enter the code printed on the QR");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${draft.businessId}/qr/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, confirm, label: "Counter" })
      });
      const json = await res.json().catch(() => ({}));
      if (json.needsConfirm) {
        setClaimMessage(json.message || json.error);
        setClaimReady(true);
        return;
      }
      if (!res.ok) {
        setClaimMessage(json.error || "Could not activate this QR");
        setClaimReady(false);
        return;
      }
      setClaimMessage(json.already ? "This QR is already active for this business" : "QR activated");
      setClaimReady(false);
      update("step", 3);
    } finally {
      setBusy(false);
    }
  }

  async function digitalQr() {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${draft.businessId}/qr`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "CUSTOM", label: "Digital" })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not create a QR");
      update("digitalCode", json.qrCode.shortCode);
      toast.success("Digital QR ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create a QR");
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const name = draft.itemName.trim();
    const price = Number(draft.itemPrice);
    if (!name || !Number.isFinite(price) || price < 0) {
      toast.error("Enter an item name and price");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${draft.businessId}/menu`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "item", name, priceRupees: price, veg: "NONE" })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not add the item");
      setDraft((current) => ({
        ...current,
        itemName: "",
        itemPrice: "",
        items: [...current.items, `${name} · ₹${price}`]
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the item");
    } finally {
      setBusy(false);
    }
  }

  async function cafeTemplate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${draft.businessId}/menu`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "template" })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not add the café menu");
      toast.success("Café menu added");
      update("step", 4);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the café menu");
    } finally {
      setBusy(false);
    }
  }

  async function sendWhatsApp() {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${draft.businessId}/whatsapp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request", phone: draft.whatsapp })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send a code");
      toast.success("Code sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send a code");
    } finally {
      setBusy(false);
    }
  }

  async function confirmWhatsApp() {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${draft.businessId}/whatsapp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: draft.whatsapp, code: draft.waCode })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not verify WhatsApp");
      update("waVerified", true);
      toast.success("WhatsApp verified");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify WhatsApp");
    } finally {
      setBusy(false);
    }
  }

  async function goLive() {
    setBusy(true);
    try {
      const links = [
        ["justdial", draft.justdial],
        ["zomato", draft.zomato],
        ["trustpilot", draft.trustpilot],
        ["facebook", draft.facebook],
        ["custom", draft.custom]
      ]
        .filter(([, url]) => url.trim())
        .map(([type, url]) => ({ type, url: url.trim() }));
      const res = await fetch("/api/onboarding/live", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId: draft.businessId,
          whatsappNumber: draft.whatsapp,
          googleReviewUrl: draft.google,
          links
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not go live");
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success("Your page is live");
      router.push(`/dashboard/businesses/${draft.businessId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not go live");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Set up your page</h1>
          <p className="text-sm text-muted-foreground">Step {draft.step} of 4. You can skip and come back.</p>
        </div>
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={skip}>Skip</Button>
      </div>
      <div className="h-2 rounded-full bg-secondary" aria-hidden>
        <div className="h-2 rounded-full bg-foreground" style={{ width: `${(draft.step / 4) * 100}%` }} />
      </div>

      {draft.step === 1 && (
        <Card>
          <CardHeader><CardTitle>Business</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Business name</span>
              <Input className="min-h-[44px]" value={draft.name} onChange={(event) => update("name", event.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Category</span>
              <select className="input min-h-[44px] w-full" value={draft.industry} onChange={(event) => update("industry", event.target.value)}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <Button type="button" className="min-h-[44px]" disabled={busy} onClick={createBusiness}>Continue</Button>
          </CardContent>
        </Card>
      )}

      {draft.step === 2 && (
        <Card>
          <CardHeader><CardTitle>Activate your QR</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Printed code</span>
              <Input className="min-h-[44px]" value={draft.code} onChange={(event) => { update("code", event.target.value); setClaimReady(false); }} />
            </label>
            <CodeScan onCode={(code) => { update("code", code); setClaimReady(false); }} />
            {claimMessage ? <p className="text-sm">{claimMessage}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="min-h-[44px]" disabled={busy} onClick={() => claim(claimReady)}>
                {claimReady ? "Activate" : "Check code"}
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={digitalQr}>Download a digital QR</Button>
            </div>
            {draft.digitalCode ? (
              <img src={`/api/qr/${draft.digitalCode}/image?format=png`} alt="Digital QR" className="h-40 w-40 rounded-xl border" />
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => update("step", 1)}>Back</Button>
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => update("step", 3)}>Skip this step</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {draft.step === 3 && (
        <Card>
          <CardHeader><CardTitle>Menu</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Item name</span>
              <Input className="min-h-[44px]" value={draft.itemName} onChange={(event) => update("itemName", event.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Price in rupees</span>
              <Input className="min-h-[44px]" inputMode="decimal" value={draft.itemPrice} onChange={(event) => update("itemPrice", event.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="min-h-[44px]" disabled={busy} onClick={addItem}>Add another</Button>
              <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={cafeTemplate}>Café template</Button>
            </div>
            {draft.items.length > 0 ? (
              <ul className="space-y-1 text-sm">{draft.items.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => update("step", 2)}>Back</Button>
              <Button type="button" className="min-h-[44px]" onClick={() => update("step", 4)}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {draft.step === 4 && (
        <Card>
          <CardHeader><CardTitle>Review and contact links</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>WhatsApp number</span>
              <Input className="min-h-[44px]" value={draft.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={sendWhatsApp}>Send code</Button>
            </div>
            <label className="block space-y-1 text-sm">
              <span>WhatsApp code</span>
              <Input className="min-h-[44px]" value={draft.waCode} onChange={(event) => update("waCode", event.target.value)} />
            </label>
            <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={confirmWhatsApp}>
              {draft.waVerified ? "WhatsApp verified" : "Verify WhatsApp"}
            </Button>
            <label className="block space-y-1 text-sm">
              <span>Google review link</span>
              <Input className="min-h-[44px]" value={draft.google} onChange={(event) => update("google", event.target.value)} placeholder="https://" />
            </label>
            {([
              ["justdial", "Justdial"],
              ["zomato", "Zomato"],
              ["trustpilot", "Trustpilot"],
              ["facebook", "Facebook"],
              ["custom", "Custom link"]
            ] as const).map(([key, label]) => (
              <label key={key} className="block space-y-1 text-sm">
                <span>{label}</span>
                <Input className="min-h-[44px]" value={draft[key]} onChange={(event) => update(key, event.target.value)} placeholder="https://" />
              </label>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => update("step", 3)}>Back</Button>
              <Button type="button" className="min-h-[44px]" disabled={busy} onClick={goLive}>Go live</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
