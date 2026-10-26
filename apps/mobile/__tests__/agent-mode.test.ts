import { resolveAppMode, switchAppMode } from "../src/agent/mode";

describe("agent mode switching", () => {
  it("starts agents in Agent mode unless they previously chose Owner mode", () => {
    expect(resolveAppMode("AGENT", null, false)).toBe("agent");
    expect(resolveAppMode("AGENT", "owner", true)).toBe("owner");
    expect(resolveAppMode("AGENT", "owner", false)).toBe("agent");
  });

  it("only lets an agent who owns a business switch modes", () => {
    expect(switchAppMode("agent", "AGENT", true)).toBe("owner");
    expect(switchAppMode("owner", "AGENT", true)).toBe("agent");
    expect(switchAppMode("agent", "USER", true)).toBe("agent");
    expect(switchAppMode("agent", "AGENT", false)).toBe("agent");
  });
});
