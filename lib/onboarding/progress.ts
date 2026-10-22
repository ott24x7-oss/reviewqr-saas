import { mergeDraft, wizardIssues, type WizardDraft } from "@reviewqr/shared";
import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { applyManualReferralCode } from "../plans/attribution";

export type OnboardingView = {
  step: number;
  referralAsked: boolean;
  completed: boolean;
  businessId: string | null;
  draft: WizardDraft;
};

function viewOf(row: {
  step: number;
  referralAsked: boolean;
  completedAt: Date | null;
  businessId: string | null;
  payload: unknown;
} | null): OnboardingView {
  return {
    step: row?.step ?? 0,
    referralAsked: row?.referralAsked ?? false,
    completed: Boolean(row?.completedAt),
    businessId: row?.businessId ?? null,
    draft: mergeDraft(row?.payload)
  };
}

export async function readOnboarding(userId: string) {
  const row = await prisma.onboardingDraft.findUnique({ where: { userId } });
  return ok(viewOf(row));
}

export async function saveOnboarding(
  userId: string,
  raw: unknown,
  contact: { phone?: string | null; email?: string | null }
) {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const current = await prisma.onboardingDraft.findUnique({ where: { userId } });
  if (current?.completedAt) return ok(viewOf(current));

  const draft = mergeDraft({ ...mergeDraft(current?.payload), ...(body.draft && typeof body.draft === "object" ? body.draft : {}) });
  const step = typeof body.step === "number" ? Math.max(0, Math.min(4, Math.floor(body.step))) : current?.step ?? 0;
  if (step >= 1) {
    const issues = wizardIssues(step, draft);
    if (issues.length) return fail(400, issues[0]);
  }

  let referralAsked = current?.referralAsked ?? false;
  let referralCode = current?.referralCode ?? null;
  if (body.referralAsked === true) referralAsked = true;
  if (typeof body.referralCode === "string" && body.referralCode.trim()) {
    const applied = await applyManualReferralCode({
      userId,
      code: body.referralCode,
      phone: contact.phone,
      email: contact.email
    });
    if (!applied.ok) return fail(400, applied.error);
    referralAsked = true;
    referralCode = body.referralCode.trim().toUpperCase();
  }

  const saved = await prisma.onboardingDraft.upsert({
    where: { userId },
    create: { userId, step, referralAsked, referralCode, payload: draft },
    update: { step, referralAsked, referralCode, payload: draft }
  });
  return ok(viewOf(saved));
}
