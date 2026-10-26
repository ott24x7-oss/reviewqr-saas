import { describe, expect, it } from "vitest";
import { normalizeAppRelease, updateMode } from "../../lib/app/release";

describe("app release config", () => {
  it("keeps version codes as whole numbers", () => {
    expect(normalizeAppRelease({ minVersionCode: 2.8, latestVersionCode: -1 })).toEqual({
      minVersionCode: 2,
      latestVersionCode: 0
    });
    expect(normalizeAppRelease(null)).toEqual({ minVersionCode: 0, latestVersionCode: 0 });
  });

  it("uses an immediate update below the minimum and a flexible update otherwise", () => {
    const config = { minVersionCode: 3, latestVersionCode: 5 };
    expect(updateMode(2, config, true)).toBe("immediate");
    expect(updateMode(3, config, true)).toBe("flexible");
    expect(updateMode(4, config, false)).toBe("flexible");
    expect(updateMode(5, config, false)).toBe("none");
    expect(updateMode(5, { minVersionCode: 0, latestVersionCode: 0 }, true)).toBe("flexible");
  });
});
