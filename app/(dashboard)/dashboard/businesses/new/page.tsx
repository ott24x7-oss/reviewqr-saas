"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    industry: "",
    description: "",
    googleReviewUrl: "",
    phone: "",
    whatsappNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    primaryColor: "#1a73e8",
    ratingThreshold: 4
  });

  function update<K extends keyof typeof form>(key: K, val: string | number) {
    setForm((s) => ({ ...s, [key]: val } as typeof form));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to create");
        return;
      }
      toast.success("Business created!");
      router.push(`/dashboard/businesses/${json.business.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Add a business</h1>
        <p className="text-sm text-muted-foreground">
          Setup takes 60 seconds. You can edit anything later.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Business name *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Spice Junction Café"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                  placeholder="Café · Restaurant"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="98xxxxxxxx"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Short description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Authentic South Indian cuisine, since 1998"
                maxLength={500}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Review settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="googleReviewUrl">Google review URL</Label>
              <Input
                id="googleReviewUrl"
                type="url"
                value={form.googleReviewUrl}
                onChange={(e) => update("googleReviewUrl", e.target.value)}
                placeholder="https://g.page/r/CXXXXXXXX/review"
              />
              <p className="text-xs text-muted-foreground">
                Find this in Google Business Profile → "Get more reviews".
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ratingThreshold">Send to Google when rating ≥</Label>
              <select
                id="ratingThreshold"
                className="input"
                value={form.ratingThreshold}
                onChange={(e) => update("ratingThreshold", Number(e.target.value))}
              >
                <option value={3}>3★ (more public reviews)</option>
                <option value={4}>4★ (recommended)</option>
                <option value={5}>5★ (only the absolute best)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsappNumber">WhatsApp alert number</Label>
              <Input
                id="whatsappNumber"
                value={form.whatsappNumber}
                onChange={(e) => update("whatsappNumber", e.target.value)}
                placeholder="98xxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                We'll WhatsApp you when negative feedback comes in.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="primaryColor">Brand colour</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={form.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="h-10 w-14 rounded-lg border cursor-pointer"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Location (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="100 Feet Road, Indiranagar"
                rows={2}
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={form.state} onChange={(e) => update("state", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pincode">PIN code</Label>
                <Input
                  id="pincode"
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                  maxLength={6}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="gradient" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Create business
          </Button>
        </div>
      </form>
    </div>
  );
}
