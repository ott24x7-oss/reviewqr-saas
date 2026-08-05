"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type FeedbackStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "IGNORED";

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "IGNORED", label: "Ignored" }
];

const STATUS_BADGE: Record<FeedbackStatus, { label: string; variant: any }> = {
  NEW: { label: "New", variant: "warning" },
  IN_PROGRESS: { label: "In progress", variant: "info" },
  RESOLVED: { label: "Resolved", variant: "success" },
  IGNORED: { label: "Ignored", variant: "secondary" }
};

export type FeedbackItemData = {
  id: string;
  message: string;
  status: FeedbackStatus;
  internalNote: string | null;
  createdAtLabel: string;
  rating: number;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  businessName: string;
  tags: { name: string; color: string }[];
};

export function FeedbackItem({ feedback }: { feedback: FeedbackItemData }) {
  const [status, setStatus] = React.useState<FeedbackStatus>(feedback.status);
  const [note, setNote] = React.useState(feedback.internalNote || "");
  const [saving, setSaving] = React.useState(false);

  // Baseline reflects what's persisted; enables a "no unsaved changes" state.
  const [savedStatus, setSavedStatus] = React.useState<FeedbackStatus>(feedback.status);
  const [savedNote, setSavedNote] = React.useState(feedback.internalNote || "");

  const dirty = status !== savedStatus || note !== savedNote;
  const customer = feedback.customerName || "Anonymous";
  const badge = STATUS_BADGE[savedStatus] || STATUS_BADGE.NEW;

  async function patch(nextStatus: FeedbackStatus) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/feedback/${feedback.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus, internalNote: note })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't save");
      setStatus(nextStatus);
      setSavedStatus(nextStatus);
      setSavedNote(note);
      toast.success(nextStatus === "RESOLVED" ? "Marked as resolved" : "Feedback updated");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="hover:shadow-card transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                feedback.rating >= 4
                  ? "bg-accent-100 text-accent-700"
                  : feedback.rating === 3
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
              }`}
            >
              {feedback.rating}★
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{customer}</div>
              <div className="text-xs text-muted-foreground truncate">
                {feedback.businessName} · {feedback.createdAtLabel}
              </div>
            </div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed mt-2">{feedback.message}</p>

        {feedback.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {feedback.tags.map((t) => (
              <span
                key={t.name}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                style={{ borderColor: t.color, color: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {feedback.customerPhone && (
            <a
              href={`https://wa.me/${feedback.customerPhone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Phone className="h-3 w-3" /> {feedback.customerPhone}
            </a>
          )}
          {feedback.customerEmail && (
            <a
              href={`mailto:${feedback.customerEmail}`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Mail className="h-3 w-3" /> {feedback.customerEmail}
            </a>
          )}
        </div>

        {/* Triage controls */}
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={saving}
                    onClick={() => setStatus(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
                      active
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "bg-background text-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`note-${feedback.id}`} className="text-xs text-muted-foreground">
              Internal note
            </Label>
            <Textarea
              id={`note-${feedback.id}`}
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a private note for your team…"
              className="min-h-[70px]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving || !dirty}
              onClick={() => patch(status)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            {savedStatus !== "RESOLVED" && (
              <Button
                type="button"
                size="sm"
                variant="accent"
                disabled={saving}
                onClick={() => patch("RESOLVED")}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Resolve
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
