import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { campaignSchema } from "@/lib/validations";
import { ownerLimitError } from "@/lib/entitlements";

/** Creates a draft campaign. Sending is not built; the plan cap still applies. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id, archived: false }
  });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = campaignSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const count = await prisma.campaign.count({
    where: { business: { ownerId: user.id } }
  });
  const limitError = await ownerLimitError(user, "campaigns", count);
  if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });

  const campaign = await prisma.campaign.create({
    data: {
      businessId: business.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      whatsappTemplate: parsed.data.whatsappTemplate || null,
      emailTemplate: parsed.data.emailTemplate || null,
      emailSubject: parsed.data.emailSubject || null,
      status: "DRAFT"
    }
  });
  return NextResponse.json({ campaign });
}
