import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { qrCodeSchema } from "@/lib/validations";
import { shortCode as makeShortCode } from "@/lib/utils";
import { ownerLimitError } from "@/lib/entitlements";
import { locationInBusiness, planOwner, requireBusinessRole, staffInBusiness } from "@/lib/tenant";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireBusinessRole(user.id, params.id, "manage");
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const codes = await prisma.qRCode.findMany({
    where: { businessId: params.id },
    include: {
      location: { select: { name: true, slug: true } },
      staff: { select: { name: true, slug: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ qrCodes: codes });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const owner = await planOwner(user, business.ownerId);
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = qrCodeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const data = parsed.data;
  const [location, staff, qrCount] = await Promise.all([
    locationInBusiness(business.id, data.locationId),
    staffInBusiness(business.id, data.staffId),
    prisma.qRCode.count({ where: { business: { ownerId: business.ownerId } } })
  ]);
  if (!location.ok) return NextResponse.json({ error: location.error }, { status: 400 });
  if (!staff.ok) return NextResponse.json({ error: staff.error }, { status: 400 });
  const limitError = await ownerLimitError(owner, "qrCodes", qrCount);
  if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });

  let code = makeShortCode();
  while (await prisma.qRCode.findUnique({ where: { shortCode: code } })) {
    code = makeShortCode();
  }

  const qr = await prisma.qRCode.create({
    data: {
      businessId: business.id,
      type: data.type,
      label: data.label,
      shortCode: code,
      locationId: data.locationId || null,
      staffId: data.staffId || null
    }
  });

  return NextResponse.json({ qrCode: qr });
}
