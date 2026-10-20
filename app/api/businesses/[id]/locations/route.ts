import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { locationSchema } from "@/lib/validations";
import { slugify, nanoSlug } from "@/lib/utils";
import { ownerLimitError } from "@/lib/entitlements";
import { planOwner, requireBusinessRole } from "@/lib/tenant";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await requireBusinessRole(user.id, params.id, "manage");
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const locations = await prisma.location.findMany({
    where: { businessId: params.id },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({ locations });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const owner = await planOwner(user, business.ownerId);
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.location.count({
    where: { business: { ownerId: business.ownerId }, isActive: true }
  });
  const limitError = await ownerLimitError(owner, "locations", count);
  if (limitError) {
    return NextResponse.json({ error: limitError }, { status: 402 });
  }

  const parsed = locationSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  let slug = slugify(parsed.data.name);
  while (
    await prisma.location.findUnique({
      where: { businessId_slug: { businessId: business.id, slug } }
    })
  ) {
    slug = slugify(parsed.data.name) + "-" + nanoSlug().slice(0, 4);
  }

  const location = await prisma.location.create({
    data: {
      businessId: business.id,
      name: parsed.data.name,
      slug,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      pincode: parsed.data.pincode || null,
      phone: parsed.data.phone || null,
      googleReviewUrl: parsed.data.googleReviewUrl || null
    }
  });
  return NextResponse.json({ location });
}
