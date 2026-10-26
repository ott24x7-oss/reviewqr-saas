"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppReleaseConfig } from "@/lib/app/release";

export function AppReleaseForm({ initial }: { initial: AppReleaseConfig }) {
  const [minVersionCode, setMin] = useState(String(initial.minVersionCode));
  const [latestVersionCode, setLatest] = useState(String(initial.latestVersionCode));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/app", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          minVersionCode: Number(minVersionCode),
          latestVersionCode: Number(latestVersionCode)
        })
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("App version saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Android version</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="minVersionCode">Minimum versionCode</Label>
          <Input
            id="minVersionCode"
            inputMode="numeric"
            value={minVersionCode}
            onChange={(event) => setMin(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Installed builds below this get an immediate Play update. 0 means no forced update.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="latestVersionCode">Latest versionCode</Label>
          <Input
            id="latestVersionCode"
            inputMode="numeric"
            value={latestVersionCode}
            onChange={(event) => setLatest(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Builds below this get a flexible Play update. The app does not sell plans.
          </p>
        </div>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
