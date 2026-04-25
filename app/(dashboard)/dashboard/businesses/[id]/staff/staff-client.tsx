"use client";
import * as React from "react";
import { Loader2, Plus, Users, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { absoluteUrl, getInitials } from "@/lib/utils";

type Staff = {
  id: string;
  name: string;
  slug: string;
  role: string;
  reviewCount: number;
};

export function StaffClient({
  businessId,
  businessSlug,
  initial
}: {
  businessId: string;
  businessSlug: string;
  initial: Staff[];
}) {
  const [staff, setStaff] = React.useState(initial);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/staff`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, role })
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed");
        return;
      }
      setStaff((s) => [...s, { ...json.staff, reviewCount: 0 }]);
      setName("");
      setRole("");
      toast.success("Staff added!");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this staff member?")) return;
    const res = await fetch(`/api/businesses/${businessId}/staff/${id}`, { method: "DELETE" });
    if (res.ok) {
      setStaff((s) => s.filter((x) => x.id !== id));
      toast.success("Removed");
    }
  }

  function copyUrl(slug: string) {
    const url = absoluteUrl(`/r/${businessSlug}?s=${slug}`);
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">Add staff member</h3>
          <form onSubmit={add} className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Name *</Label>
              <Input
                id="staff-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Arjun Kumar"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-role">Role</Label>
              <Input
                id="staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Server, Stylist, Doctor..."
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="gradient" size="sm" disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add staff
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {staff.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No staff yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm shrink-0">
                  {getInitials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {s.role || "—"} · {s.reviewCount} review{s.reviewCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyUrl(s.slug)}>
                    {copied === s.slug ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Link
                  </Button>
                  <Button variant="outline" size="icon-sm" onClick={() => remove(s.id)}>
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
