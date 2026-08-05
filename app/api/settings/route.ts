import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { effectiveTier } from "@/lib/payments";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  phone: z.string().max(20).optional().or(z.literal("")),
  whiteLabelEnabled: z.boolean().optional(),
  whiteLabelName: z.string().max(80).optional().or(z.literal("")),
  whiteLabelDomain: z.string().max(120).optional().or(z.literal("")),
  whiteLabelColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

export async function PATCH(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // White-label only allowed on Agency tier
  const data = { ...parsed.data };
  if (effectiveTier(user) !== "AGENCY") {
    delete data.whiteLabelEnabled;
    delete data.whiteLabelName;
    delete data.whiteLabelDomain;
    delete data.whiteLabelColor;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: data as any
  });

  return NextResponse.json({ ok: true, user: { id: updated.id } });
}
