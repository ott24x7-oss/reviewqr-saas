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
import { ImageUpload } from "@/components/ui/image-upload";

type Init = {
  id: string;
  name: string;
  industry: string;
  description: string;
  logo: string | null;
  coverImage: string | null;
  email: string;
  phone: string;
  whatsappNumber: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  googleReviewUrl: string;
  reviewPlatform: "google" | "trustpilot";
  trustpilotUrl: string;
  ratingThreshold: number;
  reviewGating: boolean;
  reviewQaSpecialty: string;
  reviewQaBestKnown: string;
  reviewQaAtmosphere: string;
  primaryColor: string;
  customThankYou: string;
  catalogMode: "MENU" | "SERVICES" | "BOTH";
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
          <CardTitle>Brand & images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 items-start">
            <ImageUpload
              variant="logo"
              value={form.logo}
              onChange={(v) => update("logo", v)}
              label="Logo"
              hint="Square image, auto-cropped to a circular thumbnail."
            />
            <ImageUpload
              variant="cover"
              value={form.coverImage}
              onChange={(v) => update("coverImage", v)}
              label="Cover image"
              hint="Wide banner shown at the top of your public review page."
            />
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
        </CardContent>
      </Card>

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
              <Label htmlFor="catalogMode">Catalogue</Label>
              <select
                id="catalogMode"
                aria-label="Catalogue mode"
                value={form.catalogMode}
                onChange={(e) => update("catalogMode", e.target.value as Init["catalogMode"])}
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="MENU">Menu</option>
                <option value="SERVICES">Services</option>
                <option value="BOTH">Menu & services</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                placeholder="Café, Salon, Clinic…"
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
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://yourbusiness.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={2}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pincode">PIN</Label>
              <Input
                id="pincode"
                value={form.pincode}
                onChange={(e) => update("pincode", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Help customers describe their experience</CardTitle>
          <p className="text-sm text-muted-foreground">
            These answers help AI suggest review starters. Customers can edit every suggestion before copying it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reviewQaSpecialty">What makes your business special?</Label>
            <Textarea
              id="reviewQaSpecialty"
              value={form.reviewQaSpecialty}
              onChange={(e) => update("reviewQaSpecialty", e.target.value)}
              maxLength={240}
              placeholder="Family recipes, one-to-one consultations, handmade products…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reviewQaBestKnown">What dish, service, or product are you best known for?</Label>
            <Textarea
              id="reviewQaBestKnown"
              value={form.reviewQaBestKnown}
              onChange={(e) => update("reviewQaBestKnown", e.target.value)}
              maxLength={240}
              placeholder="Masala chai, hair spa, skin consultation, cotton kurtas…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reviewQaAtmosphere">How would you describe the atmosphere?</Label>
            <Textarea
              id="reviewQaAtmosphere"
              value={form.reviewQaAtmosphere}
              onChange={(e) => update("reviewQaAtmosphere", e.target.value)}
              maxLength={240}
              placeholder="Relaxed and welcoming, quick and convenient, calm and private…"
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
            <Label htmlFor="reviewPlatform">Review platform</Label>
            <select
              id="reviewPlatform"
              className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 px-3 text-sm"
              value={form.reviewPlatform}
              onChange={(e) =>
                update("reviewPlatform", e.target.value as Init["reviewPlatform"])
              }
            >
              <option value="google">Google</option>
              <option value="trustpilot">Trustpilot</option>
            </select>
            <p className="text-xs text-muted-foreground">
              The preferred link is listed first. Every saved link stays on the customer page.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="googleReviewUrl">Google review URL</Label>
            <Input
              id="googleReviewUrl"
              value={form.googleReviewUrl}
              onChange={(e) => update("googleReviewUrl", e.target.value)}
              placeholder="https://g.page/r/…/review"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trustpilotUrl">Trustpilot review URL</Label>
            <Input
              id="trustpilotUrl"
              value={form.trustpilotUrl}
              onChange={(e) => update("trustpilotUrl", e.target.value)}
              placeholder="https://www.trustpilot.com/evaluate/yourdomain.com"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              id="reviewGating"
              type="checkbox"
              className="mt-1"
              checked={form.reviewGating}
              onChange={(e) => update("reviewGating", e.target.checked)}
            />
            <span>
              <span className="font-medium">Route low ratings to private feedback</span>
              <span className="block text-xs text-muted-foreground">
                Customers below the threshold see the private feedback form. Turn this off to show public review links for every rating.
              </span>
            </span>
          </label>
          {form.reviewGating && (
            <>
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">
                Customers below this rating will be invited to share feedback privately. Customers at or above it can continue to a public review link.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="threshold">Only show public links at</Label>
                <select
                  id="threshold"
                  className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 px-3 text-sm"
                  value={form.ratingThreshold}
                  onChange={(e) => update("ratingThreshold", Number(e.target.value))}
                >
                  <option value={4}>4 stars</option>
                  <option value={5}>5 stars</option>
                </select>
              </div>
            </>
          )}
          <p className="text-sm text-muted-foreground">
            Rewards, coupons, and loyalty stamps may be tied only to private feedback or a visit.
            Never offer them in exchange for a public review.
          </p>
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

      <div className="flex justify-end gap-2 sticky bottom-3 bg-secondary/30 backdrop-blur-sm py-2 -mx-2 px-2 rounded-lg">
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
