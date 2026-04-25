import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { staffSchema } from "@/lib/validations";
import { slugify, nanoSlug } from "@/lib/utils";
import { planLimit } from "@/lib/payments";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id }
  });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.staff.count({
    where: { business: { ownerId: user.id }, isActive: true }
  });
  if (count >= planLimit(user.subscriptionTier, "staff")) {
    return NextResponse.json({ error: "Plan staff limit reached" }, { status: 402 });
  }

  const parsed = staffSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  let slug = slugify(parsed.data.name);
  while (await prisma.staff.findUnique({ where: { businessId_slug: { businessId: business.id, slug } } })) {
    slug = slugify(parsed.data.name) + "-" + nanoSlug().slice(0, 4);
  }

  const staff = await prisma.staff.create({
    data: {
      businessId: business.id,
      name: parsed.data.name,
      slug,
      role: parsed.data.role || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      locationId: parsed.data.locationId || null
    }
  });
  return NextResponse.json({ staff });
}
