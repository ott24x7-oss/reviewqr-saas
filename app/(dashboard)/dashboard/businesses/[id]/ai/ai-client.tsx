"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Sparkles, AlertTriangle } from "lucide-react";

type Biz = {
  id: string;
  aiReviewsEnabled: boolean;
  services: string;
  description: string;
  industry: string;
  website: string;
  hasGoogleUrl: boolean;
};

export function AiReviewsClient({
  business,
  platformAiEnabled
}: {
  business: Biz;
  platformAiEnabled: boolean;
}) {
  const [enabled, setEnabled] = React.useState(business.aiReviewsEnabled);
  const [services, setServices] = React.useState(business.services);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aiReviewsEnabled: enabled, services })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.success("AI Reviews settings saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {!platformAiEnabled && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/15 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            AI isn't connected on the platform yet. An admin needs to add an AI API key in{" "}
            <span className="font-medium">Admin → AI Reviews</span> before this feature will run.
            You can still configure and save your settings here.
          </span>
        </div>
      )}
      {!business.hasGoogleUrl && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/15 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Add your <span className="font-medium">Google review link</span> in the business settings.
            Customers who want to post publicly open that link themselves.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>AI review assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>
              <span className="font-medium">Let AI clean up this business&apos;s customer text</span>
              <span className="block text-xs text-muted-foreground">
                The customer writes at least a few words, or taps a topic hint. AI suggests one
                version they can edit and copy. Nothing is posted for them.
              </span>
            </span>
          </label>

          <div className="pt-2 border-t">
            <Label htmlFor="services" className="text-xs">
              Services / what you offer (trains the AI)
            </Label>
            <Textarea
              id="services"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              maxLength={2000}
              placeholder={
                "e.g. Dine-in South Indian restaurant. Signature masala dosa, filter coffee, thalis. Family-friendly, quick service, home delivery."
              }
              className="min-h-[120px] mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              List what you offer. AI uses this only to keep a cleanup in the customer&apos;s own
              meaning. It must not add praise they did not write.
            </p>
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">Also used as context:</div>
            <div>• About: {business.description ? "✓ set" : "— add a description in business settings"}</div>
            <div>• Category: {business.industry || "—"}</div>
            <div>• Website: {business.website || "—"}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} variant="gradient" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
    </div>
  );
}
