import pino from "pino";

const ALLOWED = ["requestId", "method", "path", "status", "ms"] as const;

export type V1LogFields = {
  requestId: string;
  method: string;
  path: string;
  status: number;
  ms: number;
};

/** Drops anything except the request line. Bodies, tokens, and OTP codes never get through. */
export function v1LogFields(input: Record<string, unknown>): V1LogFields {
  return {
    requestId: typeof input.requestId === "string" ? input.requestId : "",
    method: typeof input.method === "string" ? input.method : "",
    path: typeof input.path === "string" ? input.path : "",
    status: typeof input.status === "number" ? input.status : 0,
    ms: typeof input.ms === "number" ? input.ms : 0
  };
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: ["password", "refreshToken", "code", "devCode", "authorization", "otp"]
});

export function logV1(fields: V1LogFields) {
  logger.info(v1LogFields(fields));
}
