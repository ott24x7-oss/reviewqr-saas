import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { v1LogFields } from "../../lib/api/log";
import { observe } from "../../lib/api/observe";
import { incomingRequestId } from "../../lib/api/request-id";
import { reportError } from "../../lib/api/sentry";

describe("v1 observability", () => {
  it("keeps a safe request id and drops secrets from the log line", () => {
    expect(incomingRequestId("req-1")).toBe("req-1");
    expect(incomingRequestId("bad id\ncode")).toBe("badidcode");
    expect(incomingRequestId("")).toMatch(/^[0-9a-f-]{36}$/);
    const line = v1LogFields({
      requestId: "req-1",
      method: "POST",
      path: "/api/v1/auth/otp/request",
      status: 200,
      ms: 4,
      code: "123456",
      devCode: "123456",
      refreshToken: "secret",
      body: { password: "nope" }
    });
    expect(line).toEqual({
      requestId: "req-1",
      method: "POST",
      path: "/api/v1/auth/otp/request",
      status: 200,
      ms: 4
    });
    expect(JSON.stringify(line)).not.toContain("123456");
  });

  it("does not call Sentry when the DSN is empty and swallows a failed post", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok"));
    await reportError(new Error("boom"), { requestId: "r", path: "/api/v1/me" }, { SENTRY_DSN: "" } as NodeJS.ProcessEnv, fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();

    await reportError(
      new Error("boom 123456"),
      { requestId: "r", path: "/api/v1/me" },
      { SENTRY_DSN: "https://public-key@sentry.example/12" } as NodeJS.ProcessEnv,
      async () => {
        throw new Error("collector down");
      }
    );

    const calls: string[] = [];
    await reportError(new Error("saved"), { requestId: "r", path: "/api/v1/me" }, { SENTRY_DSN: "https://public-key@sentry.example/12" } as NodeJS.ProcessEnv, async (_url, init) => {
      calls.push(String(init?.body));
      return new Response("ok");
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("saved");
    expect(calls[0]).not.toContain("public-key");
  });

  it("returns the handler response and a 500 envelope when the handler throws", async () => {
    const ok = observe(async () => NextResponse.json({ data: { ok: true } }));
    const req = new NextRequest("http://127.0.0.1/api/v1/me", { headers: { "x-request-id": "trace-1" } });
    const res = await ok(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("trace-1");

    const broken = observe(async () => {
      throw new Error("db down");
    });
    const failed = await broken(req);
    expect(failed.status).toBe(500);
    expect(await failed.json()).toEqual({ error: { code: "INTERNAL", message: "Something went wrong" } });
  });
});
