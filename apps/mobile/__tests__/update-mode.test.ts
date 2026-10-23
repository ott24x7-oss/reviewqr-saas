import { updateMode } from "../src/updates/mode";

describe("Play update mode", () => {
  const config = { minVersionCode: 3, latestVersionCode: 5 };

  it("is immediate below the minimum", () => {
    expect(updateMode(2, config, false)).toBe("immediate");
  });

  it("is flexible for a normal newer build", () => {
    expect(updateMode(4, config, false)).toBe("flexible");
    expect(updateMode(5, { minVersionCode: 0, latestVersionCode: 0 }, true)).toBe("flexible");
  });

  it("does nothing when this build is current", () => {
    expect(updateMode(5, config, false)).toBe("none");
  });
});
