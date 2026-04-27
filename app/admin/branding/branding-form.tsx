"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Upload, Trash2 } from "lucide-react";

type Branding = {
  logoDataUrl: string;
  brandName: string;
  tagline: string;
  footerText: string;
  primaryColor: string;
};

const ALLOWED_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 614400; // 600 KB — keeps the data URL under our API cap

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function BrandingForm({ initial }: { initial: Branding }) {
  const [b, setB] = React.useState<Branding>(initial);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Logo must be SVG, PNG, JPEG, or WebP");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`Logo must be ≤ ${Math.round(MAX_BYTES / 1024)} KB`);
      e.target.value = "";
      return;
    }
    try {
      const url = await fileToDataUrl(f);
      setB((prev) => ({ ...prev, logoDataUrl: url }));
    } catch {
      toast.error("Failed to read file");
    } finally {
      e.target.value = "";
    }
  }

  function clearLogo() {
    setB((prev) => ({ ...prev, logoDataUrl: "" }));
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(b)
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      toast.success("Branding saved — public pages refresh within ~60s");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-center h-32 rounded-lg border bg-secondary/30">
            {b.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoDataUrl} alt="Logo preview" className="max-h-24 max-w-full" />
            ) : (
              <span className="text-xs text-muted-foreground">
                No custom logo (using default <code>/watshop-review-lockup.svg</code>)
              </span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPickLogo}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Upload
            </Button>
            {b.logoDataUrl && (
              <Button type="button" variant="outline" size="sm" onClick={clearLogo}>
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            SVG, PNG, JPEG or WebP. Max {Math.round(MAX_BYTES / 1024)} KB. Stored as a
            data URL — no separate file hosting needed.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Text & color</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Brand name</Label>
            <Input
              value={b.brandName}
              onChange={(e) => setB({ ...b, brandName: e.target.value })}
              placeholder="WatShop Review"
              maxLength={80}
            />
          </div>
          <div>
            <Label className="text-xs">Tagline</Label>
            <Textarea
              rows={2}
              value={b.tagline}
              onChange={(e) => setB({ ...b, tagline: e.target.value })}
              placeholder="Turn happy customers into Google reviews"
              maxLength={300}
            />
          </div>
          <div>
            <Label className="text-xs">Footer text</Label>
            <Textarea
              rows={2}
              value={b.footerText}
              onChange={(e) => setB({ ...b, footerText: e.target.value })}
              placeholder="© 2026 WatShop Review. Made in India."
              maxLength={500}
            />
          </div>
          <div>
            <Label className="text-xs">Primary color (hex)</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(b.primaryColor) ? b.primaryColor : "#2563eb"}
                onChange={(e) => setB({ ...b, primaryColor: e.target.value })}
                className="h-10 w-14 rounded-lg border bg-white cursor-pointer"
                aria-label="Primary color picker"
              />
              <Input
                value={b.primaryColor}
                onChange={(e) => setB({ ...b, primaryColor: e.target.value })}
                placeholder="#2563eb"
                className="font-mono"
                maxLength={9}
              />
              {b.primaryColor && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setB({ ...b, primaryColor: "" })}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sets the <code>--brand-primary</code> CSS variable on every public page.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <Button onClick={save} disabled={saving} variant="gradient" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save branding
        </Button>
      </div>
    </div>
  );
}
