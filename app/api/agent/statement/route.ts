import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { payoutStatementCsv } from "@/lib/plans/statement";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in required", { status: 401 });
  if (user.role !== "AGENT" && user.role !== "ADMIN") return new NextResponse("Agent access only", { status: 403 });
  const rows = await prisma.commissionPayout.findMany({
    where: { agentId: user.id },
    orderBy: { paidAt: "desc" }
  });
  const csv = payoutStatementCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=\"commission-statement.csv\""
    }
  });
}
