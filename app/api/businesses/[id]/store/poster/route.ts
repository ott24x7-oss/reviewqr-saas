import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { featureBlock, planDeniedResponse } from "@/lib/plans/feature-gate";
import { storePosterPdf } from "@/lib/tap/qr-pdf";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await requireBusinessRole(user.id, params.id, "read");
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const locked = await featureBlock(access.ownerId, "store");
  if (locked) return planDeniedResponse(locked);
  const business = await prisma.business.findFirst({
    where: { id: access.id, archived: false },
    select: { name: true, slug: true }
  });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pdf = await storePosterPdf(business.slug, business.name);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${business.slug}-store.pdf"`
    }
  });
}
