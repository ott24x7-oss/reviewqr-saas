import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { resumeStep, slugProblem, wizardIssues, emptyDraft, lockedModuleText, mergeDraft, normalizeSlug } from "../../packages/shared/src/onboarding";
import { checkSlug } from "../../lib/onboarding/slug";
import { readOnboarding, saveOnboarding } from "../../lib/onboarding/progress";

const stamp = Date.now().toString(36);
const email = `onboard-${stamp}@users.reviewqr.local`;

describe("onboarding draft rules", () => {
  it("resumes the saved step and stops after finish", () => {
    expect(resumeStep(0, false)).toBe(1);
    expect(resumeStep(3, false)).toBe(3);
    expect(resumeStep(5, true)).toBeNull();
    expect(resumeStep(2, true)).toBeNull();
  });

  it("checks the page link shape and the wizard fields", () => {
    expect(slugProblem("")).toBe("empty");
    expect(slugProblem("ab")).toBe("invalid");
    expect(slugProblem("cafe-123")).toBeNull();
    const draft = { ...emptyDraft(), name: "A", category: "nope", city: "", whatsapp: "12" };
    expect(wizardIssues(1, draft).length).toBeGreaterThan(0);
    const ready = {
      ...emptyDraft(),
      name: "Mango Cafe",
      category: "cafe",
      city: "Pune",
      whatsapp: "9876543210"
    };
    expect(wizardIssues(1, ready)).toEqual([]);
    expect(wizardIssues(3, { ...ready, slug: "ok" }).join(" ")).toMatch(/page link/i);
  });

  it("keeps purchase words off a locked module card", () => {
    for (const id of ["REVIEWS", "MENU", "STORE"] as const) {
      const card = lockedModuleText(id, "en");
      const text = `${card.title} ${card.body}`;
      expect(text).toContain("Not included in your current plan");
      expect(text.toLowerCase()).not.toContain("buy");
      expect(text.toLowerCase()).not.toContain("website");
      expect(text).not.toMatch(/₹/);
    }
  });
});

describe("onboarding API helpers", () => {
  let userId = "";

  afterAll(async () => {
    if (!userId) return;
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  });

  it("saves progress and checks slug availability", async () => {
    const user = await prisma.user.create({
      data: {
        email,
        name: "Onboard",
        phone: `9${stamp}`.slice(0, 10),
        role: "USER",
        subscriptionTier: "GROWTH",
        subscriptionStatus: "TRIALING"
      }
    });
    userId = user.id;
    const saved = await saveOnboarding(
      user.id,
      {
        step: 1,
        referralAsked: true,
        draft: { name: "Mango Cafe", category: "cafe", city: "Pune", whatsapp: "9876543210" }
      },
      { phone: user.phone, email: user.email }
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.data.step).toBe(1);
    expect(saved.data.draft.name).toBe("Mango Cafe");
    const again = await readOnboarding(user.id);
    expect(again.ok && again.data.draft.city).toBe("Pune");

    const reserved = await checkSlug("login");
    expect(reserved.available).toBe(false);
    expect(reserved.reason).toBe("reserved");
    const free = await checkSlug(`mango-${stamp}`.slice(0, 20));
    expect(free.available).toBe(true);
    expect(free.url).toContain(free.slug);

    const rejected = await saveOnboarding(user.id, { step: 1, draft: { name: "" } }, { email: user.email });
    expect(rejected.ok).toBe(false);
    expect(mergeDraft({ slug: "My Cafe!" }).slug).toBe("my-cafe");
    expect(normalizeSlug("https://chat.whatsapp.com/gsgecvjdzctggrwv")).toBe("");
    const pasted = await checkSlug("https://chat.whatsapp.com/gsgecvjdzctggrwv", "Mango Cafe");
    expect(pasted.available).toBe(false);
    expect(pasted.reason).toBe("invalid");
    expect(pasted.slug).toBe("");
    expect(pasted.suggestions.some((item) => item.startsWith("mango-cafe"))).toBe(true);
  });
});
