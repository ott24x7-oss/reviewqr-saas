import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { logAudit } from "@/lib/admin";
import { sanitizeText } from "@/lib/sanitize";
import { hoursFromPublished } from "@/lib/tap/links";
import { normalizeLinks } from "@/lib/tap/page-draft";
import { jsonObject, revalidateBusinessTap } from "@/lib/tap/theme-store";

const schema = z.object({
  action: z.enum(["draft", "publish"]),
  bio: z.string().max(800).optional(),
  bioHi: z.string().max(800).optional(),
  hours: z.unknown().optional(),
  links: z.array(z.unknown()).max(40)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const links = normalizeLinks(parsed.data.links);
  if ("error" in links) return NextResponse.json({ error: links.error }, { status: 400 });

  const bio = sanitizeText(parsed.data.bio || "", 400);
  const bioHi = sanitizeText(parsed.data.bioHi || "", 400);
  const hours = hoursFromPublished({ hours: parsed.data.hours }) || {};
  const existing = await prisma.tapPage.findUnique({ where: { businessId: business.id } });
  const draft = jsonObject(existing?.draft ?? null);
  draft.bio = bio;
  draft.bioHi = bioHi;
  draft.hours = hours as Prisma.JsonValue;
  draft.links = links.links as unknown as Prisma.JsonValue;

  const publish = parsed.data.action === "publish";
  const published = jsonObject(existing?.published ?? null);
  if (publish) {
    published.bio = bio;
    published.bioHi = bioHi;
    published.hours = draft.hours;
    published.links = draft.links;
  }

  const data = {
    draft: draft as Prisma.InputJsonValue,
    ...(publish
      ? { published: published as Prisma.InputJsonValue, publishedAt: new Date() }
      : {})
  };
  await prisma.tapPage.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, ...data },
    update: data
  });
  if (publish) {
    await revalidateBusinessTap(business.id);
    await logAudit({
      userId: user.id,
      action: "tap.publish",
      entity: "business",
      entityId: business.id,
      metadata: { links: links.links.length }
    });
  }
  return NextResponse.json({ ok: true, published: publish });
}
