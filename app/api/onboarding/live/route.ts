import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { logAudit } from "@/lib/admin";
import { phoneKey } from "@/lib/otp";
import { safeTapUrl } from "@/lib/tap/urls";
import { linksForNewBusiness } from "@/lib/tap/new-business";
import { jsonObject, revalidateBusinessTap } from "@/lib/tap/theme-store";
import type { LinkType, StoredLink } from "@/lib/tap/presets";

const extra = z.object({
  type: z.enum(["justdial", "zomato", "trustpilot", "facebook", "custom"]),
  url: z.string().max(400)
});

const schema = z.object({
  businessId: z.string().min(1),
  whatsappNumber: z.string().max(20).optional().or(z.literal("")),
  googleReviewUrl: z.string().max(400).optional().or(z.literal("")),
  links: z.array(extra).max(8).optional()
});

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check the links and try again" }, { status: 400 });

  const business = await requireBusinessRole(user.id, parsed.data.businessId, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const google = (parsed.data.googleReviewUrl || "").trim();
  const safeGoogle = google ? safeTapUrl(google, "https") : null;
  if (google && !safeGoogle) return NextResponse.json({ error: "The Google link must start with https://" }, { status: 400 });
  const whatsapp = phoneKey(parsed.data.whatsappNumber || "") || business.whatsappNumber;

  await prisma.business.update({
    where: { id: business.id },
    data: {
      ...(whatsapp ? { whatsappNumber: whatsapp } : {}),
      ...(safeGoogle ? { googleReviewUrl: safeGoogle } : {})
    }
  });

  const starter = await linksForNewBusiness(business.industry, {
    phone: business.phone,
    address: business.address,
    city: business.city,
    googleReviewUrl: safeGoogle || business.googleReviewUrl,
    whatsappNumber: whatsapp
  });
  const added: StoredLink[] = [];
  for (const link of parsed.data.links || []) {
    const url = safeTapUrl(link.url.trim(), "https");
    if (!url) continue;
    added.push({
      key: link.type,
      type: link.type as LinkType,
      labelEn: link.type === "custom" ? "Link" : link.type[0].toUpperCase() + link.type.slice(1),
      labelHi: link.type === "custom" ? "लिंक" : link.type,
      enabled: true,
      sort: 100 + added.length,
      featured: false,
      url,
      emoji: "",
      schedule: null
    });
  }

  const existing = await prisma.tapPage.findUnique({ where: { businessId: business.id } });
  const draft = jsonObject(existing?.draft ?? null);
  draft.links = [...starter, ...added] as unknown as Prisma.JsonValue;
  const published = jsonObject(existing?.published ?? null);
  published.bio = draft.bio || "";
  published.bioHi = draft.bioHi || "";
  published.hours = draft.hours || {};
  published.links = draft.links;

  await prisma.tapPage.upsert({
    where: { businessId: business.id },
    create: {
      businessId: business.id,
      draft: draft as Prisma.InputJsonValue,
      published: published as Prisma.InputJsonValue,
      publishedAt: new Date()
    },
    update: {
      draft: draft as Prisma.InputJsonValue,
      published: published as Prisma.InputJsonValue,
      publishedAt: new Date()
    }
  });
  await revalidateBusinessTap(business.id);
  await logAudit({
    userId: user.id,
    action: "tap.publish",
    entity: "business",
    entityId: business.id,
    metadata: { source: "onboarding" }
  });
  return NextResponse.json({ ok: true });
}
