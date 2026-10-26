import { commissionSplit } from "../src/agent/share";

describe("agent share preview", () => {
  it("splits a ₹200 pool at 70% into ₹140 and ₹60", () => {
    expect(commissionSplit(20000, 70)).toEqual({ memberPaise: 14000, leaderPaise: 6000 });
  });

  it("rounds to whole paise and leaves the remainder with the leader", () => {
    const result = commissionSplit(101, 70);
    expect(result).toEqual({ memberPaise: 71, leaderPaise: 30 });
    expect(result.memberPaise + result.leaderPaise).toBe(101);
  });
});
