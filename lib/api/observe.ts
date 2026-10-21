import { NextRequest, NextResponse } from "next/server";
import { logV1 } from "./log";
import { incomingRequestId } from "./request-id";
import { reportError } from "./sentry";

// Method syntax is bivariant, so a handler that requires `{ params: { id: string } }` still fits.
type V1Handler = {
  handle(req: NextRequest, context?: { params: Record<string, string> }): Promise<NextResponse>;
};

/** Logs one /api/v1 line and reports thrown errors. The body is never logged. */
export function observe<T extends V1Handler["handle"]>(handler: T): T {
  return (async (req: NextRequest, context?: { params: Record<string, string> }) => {
    const started = Date.now();
    const requestId = incomingRequestId(req.headers.get("x-request-id"));
    try {
      const res = await handler(req, context);
      res.headers.set("x-request-id", requestId);
      logV1({
        requestId,
        method: req.method,
        path: req.nextUrl.pathname,
        status: res.status,
        ms: Date.now() - started
      });
      return res;
    } catch (err) {
      await reportError(err, { requestId, path: req.nextUrl.pathname });
      const res = NextResponse.json(
        { error: { code: "INTERNAL", message: "Something went wrong" } },
        { status: 500 }
      );
      res.headers.set("x-request-id", requestId);
      logV1({
        requestId,
        method: req.method,
        path: req.nextUrl.pathname,
        status: 500,
        ms: Date.now() - started
      });
      return res;
    }
  }) as T;
}
