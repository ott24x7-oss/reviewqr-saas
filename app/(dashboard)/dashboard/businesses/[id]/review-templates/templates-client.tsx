"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, timeAgo } from "@/lib/utils";

type Template = {
  id: string;
  content: string;
  used: boolean;
  usedAt: string | null;
  createdAt: string;
};

type Stats = { available: number; used: number; total: number };

export function ReviewTemplatesClient({
  businessId,
  businessName
}: {
  businessId: string;
  businessName: string;
}) {
  const [items, setItems] = React.useState<Template[]>([]);
  const [stats, setStats] = React.useState<Stats>({ available: 0, used: 0, total: 0 });
  const [search, setSearch] = React.useState("");
  const [bulkText, setBulkText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/businesses/${businessId}/review-templates`, window.location.origin);
      const res = await fetch(url.toString());
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setItems(j.items);
      setStats(j.stats);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function bulkAdd() {
    const lines = bulkText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length >= 5);
    if (lines.length === 0) {
      toast.error("Add at least one hint (5+ characters)");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/review-templates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: lines })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      toast.success(`Added ${j.added} hint${j.added === 1 ? "" : "s"}`);
      setBulkText("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: Template) {
    if (!confirm("Delete this topic hint?")) return;
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/review-templates/${t.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed");
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const filtered = items.filter((t) =>
    search ? t.content.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Topic hints" value={stats.total} accent="text-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add topic hints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={8}
            placeholder={`One hint per line.\n\nfresh coffee\nfriendly staff\nquick service`}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className="flex justify-between items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {bulkText.split("\n").filter((s) => s.trim().length >= 5).length} hint(s) to add ·
              about 40 characters works best · duplicates skipped
            </p>
            <Button onClick={bulkAdd} disabled={busy || !bulkText.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add hints
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Saved hints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search hints…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {stats.total === 0
                ? `No hints yet for ${businessName}. Add a few topics above.`
                : "No matches."}
            </div>
          ) : (
            <ul className="divide-y -mx-2">
              {filtered.map((t) => (
                <li key={t.id} className="px-2 py-3 flex gap-3 items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-line">{t.content}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <Badge variant="outline">Hint</Badge>
                      <span className="text-muted-foreground">Added {timeAgo(t.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-bold mt-1", accent)}>{value.toLocaleString("en-IN")}</div>
    </div>
  );
}
