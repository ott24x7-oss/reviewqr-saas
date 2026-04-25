"use client";
import * as React from "react";
import { Loader2, Plus, MapPin, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { absoluteUrl } from "@/lib/utils";

type Loc = {
  id: string;
  name: string;
  slug: string;
  city: string;
  isActive: boolean;
  googleReviewUrl: string;
};

export function LocationsClient({
  businessId,
  businessSlug,
  initial
}: {
  businessId: string;
  businessSlug: string;
  initial: Loc[];
}) {
  const [locations, setLocations] = React.useState(initial);
  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/locations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, city, googleReviewUrl })
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed");
        return;
      }
      setLocations((s) => [...s, json.location]);
      setName("");
      setCity("");
      setGoogleReviewUrl("");
      toast.success("Location added!");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this location?")) return;
    const res = await fetch(`/api/businesses/${businessId}/locations/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      setLocations((s) => s.filter((l) => l.id !== id));
      toast.success("Deleted");
    }
  }

  function copyUrl(slug: string) {
    const url = absoluteUrl(`/r/${businessSlug}?l=${slug}`);
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">Add new location</h3>
          <form onSubmit={add} className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Name *</Label>
              <Input
                id="loc-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Indiranagar branch"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-city">City</Label>
              <Input id="loc-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-gurl">Google review URL</Label>
              <Input
                id="loc-gurl"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/..."
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" variant="gradient" size="sm" disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add location
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {locations.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No locations yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {locations.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.city || "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyUrl(l.slug)}>
                    {copied === l.slug ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Link
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => remove(l.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
