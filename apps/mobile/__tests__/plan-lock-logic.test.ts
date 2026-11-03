import { isFeatureLockedByModules } from "../src/state/plan-lock-logic";

describe("plan feature lock fallback", () => {
  it("does not lock when entitlement data is missing or invalid", () => {
    expect(isFeatureLockedByModules(undefined, "MENU")).toBe(false);
    expect(isFeatureLockedByModules({ modules: undefined }, "MENU")).toBe(false);
    expect(isFeatureLockedByModules(["MENU", 1], "MENU")).toBe(false);
  });

  it("does not lock after an entitlement query error", () => {
    expect(isFeatureLockedByModules(["REVIEWS"], "MENU", true)).toBe(false);
  });

  it("locks only when a valid module list explicitly omits the feature", () => {
    expect(isFeatureLockedByModules(["REVIEWS", "STORE"], "MENU")).toBe(true);
    expect(isFeatureLockedByModules(["REVIEWS", "MENU", "STORE"], "MENU")).toBe(false);
  });
});
