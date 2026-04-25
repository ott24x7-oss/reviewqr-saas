import { NextRequest, NextResponse } from "next/server";
import { stringify } from "csv-stringify/sync";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: user.id }
  });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reviews = await prisma.review.findMany({
    where: { businessId: business.id },
    include: {
      feedback: true,
      location: { select: { name: true } },
      staff: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const rows = reviews.map((r) => ({
    Date: r.createdAt.toISOString(),
    Rating: r.rating,
    Sentiment: r.sentiment,
    Source: r.source || "",
    "Sent to Google": r.redirected ? "Yes" : "No",
    Location: r.location?.name || "",
    Staff: r.staff?.name || "",
    "Customer Name": r.customerName || "",
    "Customer Phone": r.customerPhone || "",
    "Customer Email": r.customerEmail || "",
    Feedback: r.feedback?.message || "",
    "Feedback Status": r.feedback?.status || "",
    "NPS Score": r.feedback?.npsScore ?? ""
  }));

  const csv = stringify(rows, { header: true });

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${business.slug}-reviews-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
