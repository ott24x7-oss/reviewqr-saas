import { render } from "@testing-library/react-native";
import {
  emptyDraft,
  lockedModuleText,
  mergeDraft,
  resumeStep,
  slugProblem,
  wizardIssues
} from "@reviewqr/shared";
import { I18nProvider } from "../src/i18n";
import { LockedModuleCard } from "../src/ui/locked-module";

describe("onboarding resume and validation", () => {
  it("reopens the saved step and stops after finish", () => {
    expect(resumeStep(0, false)).toBe(1);
    expect(resumeStep(2, false)).toBe(2);
    expect(resumeStep(4, false)).toBe(4);
    expect(resumeStep(5, true)).toBeNull();
    expect(resumeStep(1, true)).toBeNull();
  });

  it("checks the page link shape", () => {
    expect(slugProblem("")).toBe("empty");
    expect(slugProblem("a")).toBe("invalid");
    expect(slugProblem("my-cafe")).toBeNull();
    expect(mergeDraft({ slug: "My Cafe!" }).slug).toBe("my-cafe");
  });

  it("requires a name, category, city, and WhatsApp number", () => {
    const draft = { ...emptyDraft(), name: "A", category: "cafe", city: "Pune", whatsapp: "9876543210" };
    expect(wizardIssues(1, draft).length).toBeGreaterThan(0);
    expect(wizardIssues(1, { ...draft, name: "Mango Cafe" })).toEqual([]);
    expect(wizardIssues(3, { ...draft, name: "Mango Cafe", slug: "ok" }).join(" ")).toMatch(/page link/);
    expect(wizardIssues(4, { ...emptyDraft(), items: [{ name: "Tea", price: "abc" }] }).join(" ")).toMatch(/price/);
  });
});

describe("locked module card", () => {
  it("explains the module without a price or a purchase link", () => {
    for (const moduleId of ["REVIEWS", "MENU", "STORE"] as const) {
      const copy = lockedModuleText(moduleId, "en");
      const view = render(
        <I18nProvider>
          <LockedModuleCard moduleId={moduleId} />
        </I18nProvider>
      );
      const text = JSON.stringify(view.toJSON());
      expect(view.getByText(copy.title)).toBeTruthy();
      expect(view.getByText(copy.body)).toBeTruthy();
      expect(text.toLowerCase()).not.toContain("buy");
      expect(text.toLowerCase()).not.toContain("website");
      expect(text).not.toMatch(/₹/);
      view.unmount();
    }
  });
});
