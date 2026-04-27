import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { notifyPositiveReviewCopy } from "@/lib/notify";

const schema = z.object({
  slug: z.string().min(1).max(100),
  templateId: z.string().min(1).max(50)
});

/**
 * Public — atomically claim a template so no other customer sees it again.
 * Returns the content on success so the client can copy + paste on Google.
 * If the template was already claimed by a parallel request, returns
 * { alreadyUsed: true } and the client falls back to picking another one.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit({ key: `tpl-consume:${ip}`, limit: 20, windowSeconds: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Slow down" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const business = await prisma.business.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true }
  });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Atomic claim: only flips used=false → used=true. count=0 means another
  // request beat us to it (or template is already used / not for this business).
  const result = await prisma.reviewTemplate.updateMany({
    where: {
      id: parsed.data.templateId,
      businessId: business.id,
      used: false
    },
    data: { used: true, usedAt: new Date(), usedIp: ip }
  });

  if (result.count === 0) {
    return NextResponse.json({ ok: false, alreadyUsed: true }, { status: 409 });
  }

  // Fetch content to return to the client (it already has it, but this also
  // confirms ownership and keeps the API self-contained).
  const tpl = await prisma.reviewTemplate.findUnique({
    where: { id: parsed.data.templateId },
    select: { content: true }
  });

  // Fire-and-forget owner notification with the exact text the customer
  // is about to paste on Google.
  if (tpl?.content) {
    notifyPositiveReviewCopy({
      businessId: business.id,
      templateContent: tpl.content
    }).catch((e) => console.error("[notify] positive copy:", e?.message));
  }

  return NextResponse.json({ ok: true, content: tpl?.content || "" });
}
