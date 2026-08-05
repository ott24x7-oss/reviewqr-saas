"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Quote, Star, Trash2, Eye, EyeOff, Plus, Loader2 } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

type Review = {
  id: string;
  customerName: string | null;
  rating: number;
  message: string;
  createdAt: string;
};

type Testimonial = {
  id: string;
  authorName: string;
  authorRole: string | null;
  rating: number;
  message: string;
  isPublic: boolean;
  isApproved: boolean;
  source: string | null;
  createdAt: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
          )}
        />
      ))}
    </span>
  );
}

export function TestimonialsClient({
  businessId,
  initialTestimonials,
  eligibleReviews
}: {
  businessId: string;
  initialTestimonials: Testimonial[];
  eligibleReviews: Review[];
}) {
  const [testimonials, setTestimonials] = React.useState<Testimonial[]>(initialTestimonials);
  const [reviews, setReviews] = React.useState<Review[]>(eligibleReviews);
  const [publishing, setPublishing] = React.useState<string | null>(null);

  // Manual form
  const [authorName, setAuthorName] = React.useState("");
  const [rating, setRating] = React.useState(5);
  const [message, setMessage] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  async function publishReview(review: Review) {
    setPublishing(review.id);
    try {
      const res = await fetch(`/api/businesses/${businessId}/testimonials`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewId: review.id })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to publish");
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      setTestimonials((prev) => [j.testimonial, ...prev]);
      toast.success("Published as testimonial");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPublishing(null);
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !message.trim()) {
      toast.error("Author name and message are required");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/testimonials`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authorName, rating, message })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to add");
      setTestimonials((prev) => [j.testimonial, ...prev]);
      setAuthorName("");
      setRating(5);
      setMessage("");
      toast.success("Testimonial added");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function toggleVisibility(t: Testimonial) {
    const next = !t.isPublic;
    // optimistic
    setTestimonials((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, isPublic: next } : x))
    );
    try {
      const res = await fetch(`/api/businesses/${businessId}/testimonials/${t.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: next })
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(next ? "Now public" : "Hidden from widget");
    } catch (e: any) {
      // revert
      setTestimonials((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, isPublic: t.isPublic } : x))
      );
      toast.error(e.message);
    }
  }

  async function remove(t: Testimonial) {
    if (!confirm("Delete this testimonial?")) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/testimonials/${t.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed");
      setTestimonials((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      {/* Publish a review */}
      <Card>
        <CardHeader>
          <CardTitle>Publish a review</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No eligible 4–5★ reviews with written feedback to publish yet.
            </div>
          ) : (
            <ul className="divide-y -mx-2">
              {reviews.map((r) => (
                <li key={r.id} className="px-2 py-3 flex gap-3 items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {r.customerName || "Customer"}
                      </span>
                      <Stars rating={r.rating} />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1 whitespace-pre-line">
                      {r.message}
                    </p>
                    <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => publishReview(r)}
                    disabled={publishing === r.id}
                    className="shrink-0"
                  >
                    {publishing === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Quote className="h-3.5 w-3.5" />
                    )}
                    Publish
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add manually */}
      <Card>
        <CardHeader>
          <CardTitle>Add manually</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addManual} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="authorName">Author name</Label>
                <Input
                  id="authorName"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rating">Rating</Label>
                <select
                  id="rating"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did they say about your business?"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={adding || !authorName.trim() || !message.trim()}>
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add testimonial
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Your testimonials */}
      <Card>
        <CardHeader>
          <CardTitle>Your testimonials</CardTitle>
        </CardHeader>
        <CardContent>
          {testimonials.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No testimonials yet — publish a review or add one above.
            </div>
          ) : (
            <ul className="divide-y -mx-2">
              {testimonials.map((t) => (
                <li key={t.id} className="px-2 py-3 flex gap-3 items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{t.authorName}</span>
                      {t.authorRole && (
                        <span className="text-xs text-muted-foreground">{t.authorRole}</span>
                      )}
                      <Stars rating={t.rating} />
                    </div>
                    <p className="text-sm leading-relaxed mt-1 whitespace-pre-line">
                      {t.message}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      {t.isPublic ? (
                        <Badge variant="success">Public</Badge>
                      ) : (
                        <Badge variant="outline">Hidden</Badge>
                      )}
                      {t.isApproved ? (
                        <Badge variant="outline">Approved</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      <span className="text-muted-foreground">Added {timeAgo(t.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleVisibility(t)}
                      title={t.isPublic ? "Hide from widget" : "Make public"}
                    >
                      {t.isPublic ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(t)}
                      title="Delete"
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
