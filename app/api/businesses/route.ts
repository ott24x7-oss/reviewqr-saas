import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { businessSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { ownerLimitError } from "@/lib/entitlements";
import { attachTapDraft } from "@/lib/tap/new-business";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id, archived: false },
    include: {
      _count: { select: { reviews: true, feedbacks: true, locations: true, qrCodes: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ businesses });
}

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Plan limit check
  const count = await prisma.business.count({
    where: { ownerId: user.id, archived: false }
  });
  const limitError = await ownerLimitError(user, "businesses", count);
  if (limitError) {
    return NextResponse.json({ error: limitError }, { status: 402 });
  }

  const parsed = businessSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  let slug = slugify(data.name);
  let n = 0;
  while (await prisma.business.findUnique({ where: { slug } })) {
    n += 1;
    slug = slugify(data.name) + "-" + (n + 1);
    if (n > 5) {
      slug = slugify(data.name, true);
      break;
    }
  }

  const business = await prisma.business.create({
    data: {
      ownerId: user.id,
      name: data.name,
      slug,
      industry: data.industry || null,
      description: data.description || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsappNumber: data.whatsappNumber || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      googleReviewUrl: data.googleReviewUrl || null,
      ratingThreshold: data.ratingThreshold,
      primaryColor: data.primaryColor,
      logo: data.logo || null,
      coverImage: data.coverImage || null
    }
  });

  await attachTapDraft(business.id, data.industry, {
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    googleReviewUrl: data.googleReviewUrl,
    whatsappNumber: data.whatsappNumber
  });

  return NextResponse.json({ business });
}
