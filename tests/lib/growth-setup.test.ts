import { describe, expect, it } from "vitest";
import { setupChecklist, type SetupInput } from "../../lib/growth/setup";

const blank: SetupInput = {
  hasDetails: false,
  hasLink: false,
  hasMenu: false,
  menuOn: true,
  hasButtons: false,
  hasHours: false,
  hasUpi: false,
  printed: false
};

describe("setup checklist", () => {
  it("lists the six setup steps and stays open until each one is done", () => {
    const steps = setupChecklist(blank);
    expect(steps.map((step) => step.key)).toEqual(["details", "link", "menu", "buttons", "store", "print"]);
    expect(steps.every((step) => step.done === false)).toBe(true);
  });

  it("counts the menu step done when the menu module is off", () => {
    const steps = setupChecklist({ ...blank, menuOn: false });
    expect(steps.find((step) => step.key === "menu")?.done).toBe(true);
  });

  it("needs both opening hours and a UPI id before the store step is done", () => {
    expect(setupChecklist({ ...blank, hasHours: true }).find((step) => step.key === "store")?.done).toBe(false);
    expect(setupChecklist({ ...blank, hasUpi: true }).find((step) => step.key === "store")?.done).toBe(false);
    expect(setupChecklist({ ...blank, hasHours: true, hasUpi: true }).find((step) => step.key === "store")?.done).toBe(true);
  });
});
