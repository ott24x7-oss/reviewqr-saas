import { Prisma } from "@prisma/client";
import { ONBOARDING_THEMES, mergeDraft, wizardIssues, type WizardDraft } from "@reviewqr/shared";
import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { ownerLimitError, type LimitUser } from "../entitlements";
import { generateQrDataUrl } from "../qr";
import { attachTapDraft } from "../tap/new-business";
import { createAssignedCode } from "../tap/qr-mutate";
import { canonicalThemeId } from "../tap/themes";
import { absoluteUrl } from "../utils";
import { checkSlug } from "./slug";

function themeColor(themeId: string) {
  return ONBOARDING_THEMES.find((item) => item.id === themeId)?.button || "#9a3412";
}

function paise(price: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(price.trim())) return null;
  return Math.round(Number(price) * 100);
}

async function publishTheme(businessId: string, themeId: string) {
  const page = await prisma.tapPage.findUnique({ where: { businessId } });
  const draft = page?.draft && typeof page.draft === "object" ? (page.draft as Record<string, unknown>) : {};
  const theme = canonicalThemeId(themeId);
  await prisma.tapPage.update({
    where: { businessId },
    data: {
      published: {
        ...draft,
        theme
      } as Prisma.InputJsonValue,
      publishedAt: new Date()
    }
  });
}

export async function finishOnboarding(user: LimitUser & { email?: string | null }) {
  const row = await prisma.onboardingDraft.findUnique({ where: { userId: user.id } });
  if (row?.completedAt && row.businessId) {
    const business = await prisma.business.findUnique({
      where: { id: row.businessId },
      select: { id: true, slug: true, name: true }
    });
    const qr = business
      ? await prisma.qRCode.findFirst({
          where: { businessId: business.id, status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          select: { shortCode: true }
        })
      : null;
    if (business && qr) {
      const publicUrl = absoluteUrl(`/${business.slug}`);
      const scanUrl = absoluteUrl(`/q/${qr.shortCode}`);
      return ok({
        businessId: business.id,
        name: business.name,
        slug: business.slug,
        publicUrl,
        scanUrl,
        qrDataUrl: await generateQrDataUrl(scanUrl, { size: 480 })
      });
    }
  }

  const draft: WizardDraft = mergeDraft(row?.payload);
  for (const step of [1, 2, 3, 4]) {
    const issues = wizardIssues(step, draft);
    if (issues.length) return fail(400, issues[0]);
  }
  const slug = await checkSlug(draft.slug);
  if (!slug.available) {
    const reason =
      slug.reason === "reserved" ? "That page link is reserved" : slug.reason === "taken" ? "That page link is taken" : "Choose a page link";
    return fail(409, reason);
  }

  const count = await prisma.business.count({ where: { ownerId: user.id, archived: false } });
  const limitError = await ownerLimitError(user, "businesses", count);
  if (limitError) return fail(402, limitError);

  let business;
  try {
    business = await prisma.business.create({
      data: {
        ownerId: user.id,
        name: draft.name.trim(),
        slug: slug.slug,
        industry: draft.category,
        city: draft.city.trim(),
        phone: draft.whatsapp,
        whatsappNumber: draft.whatsapp,
        email: user.email || null,
        googleReviewUrl: draft.googleReviewUrl || null,
        logo: draft.logo || null,
        coverImage: draft.cover || null,
        primaryColor: themeColor(draft.themeId),
        ratingThreshold: 4,
        reviewGating: false
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, "That page link is taken");
    }
    throw error;
  }

  await attachTapDraft(business.id, draft.category, {
    phone: draft.whatsapp,
    whatsappNumber: draft.whatsapp,
    city: draft.city,
    googleReviewUrl: draft.googleReviewUrl
  });
  await publishTheme(business.id, draft.themeId);

  const items = draft.items
    .map((item) => ({ name: item.name.trim(), pricePaise: paise(item.price) }))
    .filter((item): item is { name: string; pricePaise: number } => item.name.length > 0 && item.pricePaise !== null)
    .slice(0, 3);
  if (items.length) {
    await prisma.menuItem.createMany({
      data: items.map((item, index) => ({
        businessId: business.id,
        name: item.name,
        pricePaise: item.pricePaise,
        sortOrder: index,
        available: true
      }))
    });
  }

  const qr = await createAssignedCode({ businessId: business.id, label: "Counter", type: "COUNTER" });
  const attribution = await prisma.signupAttribution.findUnique({
    where: { userId: user.id },
    select: { agentId: true }
  });
  if (attribution?.agentId) {
    await prisma.business.update({ where: { id: business.id }, data: { agentId: attribution.agentId } });
  }

  await prisma.onboardingDraft.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      step: 5,
      referralAsked: true,
      payload: draft,
      businessId: business.id,
      completedAt: new Date()
    },
    update: { step: 5, businessId: business.id, completedAt: new Date(), payload: draft }
  });

  const publicUrl = absoluteUrl(`/${business.slug}`);
  const scanUrl = absoluteUrl(`/q/${qr.shortCode}`);
  return ok({
    businessId: business.id,
    name: business.name,
    slug: business.slug,
    publicUrl,
    scanUrl,
    qrDataUrl: await generateQrDataUrl(scanUrl, { size: 480 })
  });
}
