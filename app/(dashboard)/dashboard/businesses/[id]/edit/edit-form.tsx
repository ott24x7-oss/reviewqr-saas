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

type Init = {
  id: string;
  name: string;
  industry: string;
  description: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  googleReviewUrl: string;
  ratingThreshold: number;
  primaryColor: string;
  customThankYou: string;
};

export function EditBusinessForm({ initial }: { initial: Init }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);

  function update<K extends keyof Init>(key: K, val: Init[K]) {
    setForm((s) => ({ ...s, [key]: val }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed");
        return;
      }
      toast.success("Saved!");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Basic info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="googleReviewUrl">Google review URL</Label>
            <Input
              id="googleReviewUrl"
              value={form.googleReviewUrl}
              onChange={(e) => update("googleReviewUrl", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="threshold">Rating threshold</Label>
            <select
              id="threshold"
              className="input"
              value={form.ratingThreshold}
              onChange={(e) => update("ratingThreshold", Number(e.target.value))}
            >
              <option value={3}>3★+</option>
              <option value={4}>4★+ (recommended)</option>
              <option value={5}>5★ only</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primaryColor">Brand colour</Label>
            <div className="flex gap-3">
              <input
                type="color"
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
          <div className="space-y-1.5">
            <Label htmlFor="whatsappNumber">WhatsApp alert number</Label>
            <Input
              id="whatsappNumber"
              value={form.whatsappNumber}
              onChange={(e) => update("whatsappNumber", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customThankYou">Custom thank-you message</Label>
            <Textarea
              id="customThankYou"
              value={form.customThankYou}
              onChange={(e) => update("customThankYou", e.target.value)}
              placeholder="We're sorry your experience wasn't up to mark. The owner will personally call you."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
