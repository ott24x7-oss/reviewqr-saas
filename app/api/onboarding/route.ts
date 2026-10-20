import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { businessSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { ownerLimitError } from "@/lib/entitlements";
import { linksForNewBusiness } from "@/lib/tap/new-business";
import { isReservedSlug } from "@/lib/tap/reserved-slugs";

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await prisma.business.count({ where: { ownerId: user.id, archived: false } });
  if (owned > 0) {
    return NextResponse.json({ error: "You already have a business" }, { status: 400 });
  }
  const limitError = await ownerLimitError(user, "businesses", owned);
  if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });
  const parsed = businessSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  let slug = slugify(data.name);
  let n = 0;
  while (isReservedSlug(slug) || (await prisma.business.findUnique({ where: { slug } }))) {
    n += 1;
    slug = n > 5 ? slugify(data.name, true) : `${slugify(data.name)}-${n + 1}`;
    if (n > 5) break;
  }

  const starterLinks = await linksForNewBusiness(data.industry, {
    phone: data.phone,
    address: data.address,
    city: data.city,
    googleReviewUrl: data.googleReviewUrl
  });
  const created = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        ownerId: user.id,
        name: data.name,
        slug,
        industry: data.industry || null,
        city: data.city || null,
        address: data.address || null,
        phone: data.phone || null,
        googlePlaceId: data.googlePlaceId || null,
        googleReviewUrl: data.googleReviewUrl || null,
        logo: data.logo || null,
        primaryColor: data.primaryColor
      }
    });
    await tx.tapPage.create({
      data: { businessId: business.id, draft: { links: starterLinks, bio: "", bioHi: "" } }
    });
    return { business };
  });

  return NextResponse.json({
    businessId: created.business.id,
    name: created.business.name,
    slug: created.business.slug
  });
}
