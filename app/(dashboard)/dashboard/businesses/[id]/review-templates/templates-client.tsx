"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Circle,
  Search
} from "lucide-react";
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
  const [filter, setFilter] = React.useState<"all" | "available" | "used">("all");
  const [search, setSearch] = React.useState("");
  const [bulkText, setBulkText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/businesses/${businessId}/review-templates`, window.location.origin);
      if (filter !== "all") url.searchParams.set("status", filter);
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
  }, [businessId, filter]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function bulkAdd() {
    const lines = bulkText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length >= 5);
    if (lines.length === 0) {
      toast.error("Add at least one review (5+ characters)");
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
      toast.success(`Added ${j.added} review${j.added === 1 ? "" : "s"}`);
      setBulkText("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleUsed(t: Template) {
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/review-templates/${t.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ used: !t.used })
        }
      );
      if (!res.ok) throw new Error("Failed");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(t: Template) {
    if (!confirm("Delete this review template?")) return;
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
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Available" value={stats.available} accent="text-emerald-600" />
        <StatTile label="Used" value={stats.used} accent="text-slate-500" />
        <StatTile label="Total stock" value={stats.total} accent="text-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk add reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={8}
            placeholder={`One review per line. Paste 100+ at once.\n\nGreat experience working with ${businessName}, the team really knows what they're doing.\n${businessName} delivered exactly what they promised, on time and on budget.\nProfessional, responsive — would recommend to anyone needing this kind of work.`}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {bulkText.split("\n").filter((s) => s.trim().length >= 5).length} review(s) to add ·
              5–2000 characters each · duplicates skipped
            </p>
            <Button onClick={bulkAdd} disabled={busy || !bulkText.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to stock
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Stock</CardTitle>
          <div className="flex gap-1 p-1 rounded-full bg-secondary text-xs">
            {(["all", "available", "used"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full font-medium transition",
                  filter === f
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reviews…"
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
                ? "No templates yet — paste some in the box above."
                : "No matches."}
            </div>
          ) : (
            <ul className="divide-y -mx-2">
              {filtered.map((t) => (
                <li key={t.id} className="px-2 py-3 flex gap-3 items-start">
                  <button
                    type="button"
                    onClick={() => toggleUsed(t)}
                    className="shrink-0 mt-0.5"
                    title={t.used ? "Mark as available" : "Mark as used"}
                  >
                    {t.used ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-relaxed whitespace-pre-line",
                        t.used && "text-muted-foreground line-through"
                      )}
                    >
                      {t.content}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      {t.used ? (
                        <Badge variant="outline">
                          Used {t.usedAt ? timeAgo(t.usedAt) : ""}
                        </Badge>
                      ) : (
                        <Badge variant="success">Available</Badge>
                      )}
                      <span className="text-muted-foreground">
                        Added {timeAgo(t.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {t.used && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleUsed(t)}
                        title="Re-enable"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-bold mt-1", accent)}>{value.toLocaleString("en-IN")}</div>
    </div>
  );
}
