import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { normalizeLinks } from "@/lib/tap/page-draft";
import { CODE_PRESETS } from "@/lib/tap/presets";

const schema = z.object({
  industry: z.string().min(2).max(40),
  links: z.array(z.unknown()).max(40).optional(),
  remove: z.boolean().optional()
});

function presetKey(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function GET() {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const rows = await prisma.industryPreset.findMany({ orderBy: { industry: "asc" } });
  return NextResponse.json({
    code: Object.entries(CODE_PRESETS).map(([industry, links]) => ({ industry, links })),
    saved: rows
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const industry = presetKey(parsed.data.industry);
  if (industry.length < 2) return NextResponse.json({ error: "Name the industry" }, { status: 400 });

  if (parsed.data.remove) {
    await prisma.industryPreset.deleteMany({ where: { industry } });
  } else {
    const links = normalizeLinks(parsed.data.links || []);
    if ("error" in links) return NextResponse.json({ error: links.error }, { status: 400 });
    if (!links.links.length) return NextResponse.json({ error: "Add at least one button" }, { status: 400 });
    await prisma.industryPreset.upsert({
      where: { industry },
      create: { industry, links: links.links },
      update: { links: links.links }
    });
  }
  await logAudit({
    userId: admin.user?.id,
    action: "preset.update",
    entity: "industry",
    entityId: industry,
    metadata: { remove: !!parsed.data.remove }
  });
  return NextResponse.json({ ok: true, industry });
}
