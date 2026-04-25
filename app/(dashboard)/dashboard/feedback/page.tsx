import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import { MessageSquare, Phone, Mail } from "lucide-react";
import { FeedbackFilter } from "./feedback-filter";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  searchParams
}: {
  searchParams: { status?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id, archived: false },
    select: { id: true }
  });
  const businessIds = businesses.map((b) => b.id);

  const status = searchParams.status?.toUpperCase();
  const filter =
    status && ["NEW", "IN_PROGRESS", "RESOLVED", "IGNORED"].includes(status) ? (status as any) : undefined;

  const feedbacks = await prisma.feedback.findMany({
    where: {
      businessId: { in: businessIds },
      ...(filter && { status: filter })
    },
    include: {
      review: { select: { rating: true, customerName: true, customerPhone: true, customerEmail: true } },
      business: { select: { name: true, slug: true, whatsappNumber: true } },
      tags: { include: { tag: { select: { name: true, color: true } } } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Feedback inbox</h1>
        <p className="text-sm text-muted-foreground">
          Private feedback from customers — reply, resolve, save your reputation
        </p>
      </div>

      <FeedbackFilter active={filter || "ALL"} />

      {feedbacks.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No feedback {filter ? `with status ${filter}` : "yet"}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filter ? "Try changing the filter." : "When customers rate below your threshold, their feedback shows up here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((f) => {
            const customer = f.review.customerName || "Anonymous";
            return (
              <Card key={f.id} className="hover:shadow-card transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          f.review.rating >= 4
                            ? "bg-accent-100 text-accent-700"
                            : f.review.rating === 3
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {f.review.rating}★
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{customer}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {f.business.name} · {timeAgo(f.createdAt)}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed mt-2">{f.message}</p>
                  {f.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {f.tags.map((t) => (
                        <span
                          key={t.tag.name}
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                          style={{ borderColor: t.tag.color, color: t.tag.color }}
                        >
                          {t.tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {f.review.customerPhone && (
                      <a
                        href={`https://wa.me/${f.review.customerPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" /> {f.review.customerPhone}
                      </a>
                    )}
                    {f.review.customerEmail && (
                      <a
                        href={`mailto:${f.review.customerEmail}`}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" /> {f.review.customerEmail}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    NEW: { label: "New", variant: "warning" },
    IN_PROGRESS: { label: "In progress", variant: "info" },
    RESOLVED: { label: "Resolved", variant: "success" },
    IGNORED: { label: "Ignored", variant: "secondary" }
  };
  const m = map[status] || map.NEW;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
