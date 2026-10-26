import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { planDeniedResponse } from "@/lib/plans/feature-gate";
import { menuAiAccess } from "@/lib/store/menu-access";
import { getAiConfig } from "@/lib/settings";
import { suggestItemCopy } from "@/lib/ai";
import { AiQuotaError } from "@/lib/entitlements";

const schema = z.object({
  field: z.enum(["description", "nameHi"]),
  name: z.string().min(1).max(80),
  nameHi: z.string().max(80).optional()
});

const unavailable = "A suggestion isn't available right now. You can type it yourself.";

/** Fills one field for the owner to review. Nothing is saved here. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await menuAiAccess(user.id, params.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ("blocked" in access && access.blocked) return planDeniedResponse(access.blocked);
  const business = access.business;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Name the item first" }, { status: 400 });

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) {
    return NextResponse.json({ error: unavailable }, { status: 503 });
  }

  const row = await prisma.business.findUnique({
    where: { id: business.id },
    select: { name: true, industry: true, description: true, services: true, city: true, website: true }
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const text = await suggestItemCopy(
      cfg,
      row,
      { field: parsed.data.field, name: parsed.data.name, nameHi: parsed.data.nameHi },
      business.id
    );
    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof AiQuotaError) return NextResponse.json({ error: error.message }, { status: 429 });
    return NextResponse.json({ error: unavailable }, { status: 503 });
  }
}
