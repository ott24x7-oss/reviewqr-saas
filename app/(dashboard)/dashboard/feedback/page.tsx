import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { FeedbackFilter } from "./feedback-filter";
import { FeedbackItem } from "./feedback-item";

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
          {feedbacks.map((f) => (
            <FeedbackItem
              key={f.id}
              feedback={{
                id: f.id,
                message: f.message,
                status: f.status,
                internalNote: f.internalNote,
                createdAtLabel: timeAgo(f.createdAt),
                rating: f.review.rating,
                customerName: f.review.customerName,
                customerPhone: f.review.customerPhone,
                customerEmail: f.review.customerEmail,
                businessName: f.business.name,
                tags: f.tags.map((t) => ({ name: t.tag.name, color: t.tag.color }))
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
