import { observe } from "@/lib/api/observe";
import { NextRequest, NextResponse } from "next/server";
import { requireV1User } from "@/lib/api/v1";
import { requireBusinessAccess } from "@/lib/access";
import { prisma } from "@/lib/db";
import { loadEntitlement } from "@/lib/plans/entitlements";

export const dynamic = "force-dynamic";

async function putHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const access = await requireBusinessAccess(auth.user.id, params.id, "manage");
  if (!access) return NextResponse.json({ error: "You cannot manage this business" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { hideBranding?: unknown };
  if (typeof body.hideBranding !== "boolean") return NextResponse.json({ error: "Choose whether branding should be hidden" }, { status: 400 });
  const business = await prisma.business.findUnique({ where: { id: params.id }, select: { ownerId: true, hideBrandingSource: true } });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  const entitlement = await loadEntitlement(business.ownerId);
  if (entitlement.tier !== "AGENCY") return NextResponse.json({ error: "This switch is available on the Agency plan" }, { status: 403 });
  if (business.hideBrandingSource === "ADMIN" || business.hideBrandingSource === "PURCHASE") {
    return NextResponse.json({ error: "Only an admin can change this branding setting" }, { status: 403 });
  }
  await prisma.business.update({
    where: { id: params.id },
    data: { hideBranding: body.hideBranding, hideBrandingSource: "PLAN" }
  });
  return NextResponse.json({ hideBranding: body.hideBranding, hideBrandingSource: "PLAN" });
}

export const PUT = observe(putHandler);
