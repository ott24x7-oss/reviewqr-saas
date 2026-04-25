"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const types = [
  { value: "COUNTER", label: "Counter / front desk" },
  { value: "TABLE", label: "Table tent" },
  { value: "BILL", label: "Bill / receipt" },
  { value: "CARD", label: "Visiting card" },
  { value: "POSTER", label: "Poster" },
  { value: "CUSTOM", label: "Custom" }
];

export function QrCreateClient({
  businessId,
  locations,
  staff
}: {
  businessId: string;
  locations: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [type, setType] = React.useState("COUNTER");
  const [label, setLabel] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [staffId, setStaffId] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!label) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/qr`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, label, locationId, staffId })
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed");
        return;
      }
      toast.success("QR code created!");
      router.push(`/dashboard/qr-codes/${json.qrCode.shortCode}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold mb-3">Create new QR code</h3>
        <form onSubmit={create} className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="label">Label *</Label>
            <Input
              id="label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Front counter, Table 4..."
            />
          </div>
          {locations.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="loc">Location (optional)</Label>
              <select
                id="loc"
                className="input"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">— Any —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {staff.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="staff">Staff (optional)</Label>
              <select
                id="staff"
                className="input"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              >
                <option value="">— None —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" variant="gradient" size="sm" disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create QR code
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
