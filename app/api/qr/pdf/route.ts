import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accessRole } from "@/lib/tenant";
import { isLookupCode } from "@/lib/tap/ids";
import { qrSheetPdf } from "@/lib/tap/qr-pdf";

const schema = z.object({
  codes: z.array(z.string()).min(1).max(100)
});

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose at least one code" }, { status: 400 });
  const codes = Array.from(new Set(parsed.data.codes));
  if (codes.some((code) => !isLookupCode(code))) {
    return NextResponse.json({ error: "Enter a valid QR code" }, { status: 400 });
  }

  const rows = await prisma.qRCode.findMany({
    where: { shortCode: { in: codes } },
    include: {
      business: {
        select: {
          ownerId: true,
          agentId: true,
          members: { where: { userId: user.id }, select: { role: true }, take: 1 }
        }
      }
    }
  });
  if (rows.length !== codes.length) return NextResponse.json({ error: "A code was not found" }, { status: 404 });

  if (user.role !== "ADMIN") {
    for (const row of rows) {
      if (!row.business) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const role = accessRole(row.business.ownerId, user.id, row.business.members[0]?.role, row.business.agentId);
      if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const byCode = new Map(rows.map((row) => [row.shortCode, row]));
  const ordered = codes.map((code) => byCode.get(code)?.shortCode).filter((code): code is string => !!code);
  const pdf = await qrSheetPdf(ordered);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "attachment; filename=\"qr-codes.pdf\"",
      "cache-control": "private, no-store"
    }
  });
}
