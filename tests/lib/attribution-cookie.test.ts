import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { JOIN_COOKIE, joinCookieUpdate } from "../../lib/plans/attribution";
import { GET as join } from "../../app/join/[code]/route";
import { GET as refer } from "../../app/refer/[code]/route";

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie: `${JOIN_COOKIE}=${cookie}` } : undefined
  });
}

describe("attribution cookie", () => {
  it("keeps the first agent code and lets an agent replace an owner", () => {
    expect(joinCookieUpdate(null, { kind: "agent", code: "agent1" })).toBe("agent:AGENT1");
    expect(joinCookieUpdate("owner:OWNER1", { kind: "agent", code: "agent1" })).toBe("agent:AGENT1");
    expect(joinCookieUpdate("agent:AGENT1", { kind: "agent", code: "agent2" })).toBeNull();
    expect(joinCookieUpdate("agent:AGENT1", { kind: "owner", code: "owner1" })).toBeNull();
    expect(joinCookieUpdate("owner:OWNER1", { kind: "owner", code: "owner2" })).toBeNull();
    expect(joinCookieUpdate(null, { kind: "owner", code: "owner1" })).toBe("owner:OWNER1");
  });

  it("does not let /refer or /join replace an agent cookie", async () => {
    const fromJoin = await join(request("/join/AGENT2", "agent:AGENT1"), { params: { code: "AGENT2" } });
    const fromRefer = await refer(request("/refer/OWNER1", "agent:AGENT1"), { params: { code: "OWNER1" } });
    expect(fromJoin.cookies.get(JOIN_COOKIE)).toBeUndefined();
    expect(fromRefer.cookies.get(JOIN_COOKIE)).toBeUndefined();
    expect(fromJoin.headers.get("location")).toContain("/register");
  });

  it("lets /join replace an owner cookie", async () => {
    const res = await join(request("/join/AGENT1", "owner:OWNER1"), { params: { code: "AGENT1" } });
    expect(res.cookies.get(JOIN_COOKIE)?.value).toBe("agent:AGENT1");
  });
});
