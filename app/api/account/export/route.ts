import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id },
    include: {
      locations: true,
      staffMembers: true,
      qrCodes: { select: { id: true, label: true, shortCode: true, scans: true, type: true, createdAt: true } },
      reviews: {
        take: 5000,
        orderBy: { createdAt: "desc" },
        include: { feedback: true }
      }
    }
  });

  const body = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    },
    businesses
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="reviewqr-export-${user.id}.json"`
    }
  });
}
