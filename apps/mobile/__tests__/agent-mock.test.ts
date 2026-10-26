import { agentMockRequest, resetAgentMock } from "../src/agent/mock";
import { agentRequest } from "../src/agent/api";

describe("agent API mock", () => {
  const savedValue = process.env.EXPO_PUBLIC_AGENT_MOCK;

  beforeEach(() => {
    resetAgentMock();
    process.env.EXPO_PUBLIC_AGENT_MOCK = "1";
  });

  afterAll(() => {
    if (savedValue === undefined) delete process.env.EXPO_PUBLIC_AGENT_MOCK;
    else process.env.EXPO_PUBLIC_AGENT_MOCK = savedValue;
  });

  it("serves typed home data when local mock mode is enabled", async () => {
    const home = await agentRequest<{ status: string; earnings: { monthPaise: number } }>("/agent/home");
    expect(home.status).toBe("ACTIVE");
    expect(home.earnings.monthPaise).toBeGreaterThan(0);
  });

  it("updates the team member share and pause status", async () => {
    const member = await agentMockRequest<{ id: string; sharePercent: number; status: string }>("/agent/team/member-1", {
      method: "PATCH",
      body: JSON.stringify({ sharePercent: 80 })
    });
    expect(member.sharePercent).toBe(80);
    const paused = await agentMockRequest<{ status: string }>("/agent/team/member-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "pause" })
    });
    expect(paused.status).toBe("PAUSED");
  });

  it("returns paged commissions and moves a joined user to pending", async () => {
    const first = await agentMockRequest<{ items: { id: string }[]; nextCursor: string }>("/agent/commissions");
    const next = await agentMockRequest<{ items: { id: string }[]; nextCursor: null }>(`/agent/commissions?cursor=${first.nextCursor}`);
    expect(first.items.length).toBe(3);
    expect(next.items[0].id).not.toBe(first.items[0].id);
    await agentRequest("/agent/join", { method: "POST", body: JSON.stringify({ code: "TEAM0001" }) });
    expect((await agentRequest<{ status: string }>("/agent/home")).status).toBe("PENDING");
  });
});
