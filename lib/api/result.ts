import type { ApiErrorCode } from "@reviewqr/shared";

export type Fail = {
  ok: false;
  status: number;
  error: string;
  code?: ApiErrorCode;
  feature?: string;
};
export type ServiceResult<T> = { ok: true; data: T } | Fail;

export function fail(status: number, error: string): Fail {
  return { ok: false, status, error };
}

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function codeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 400:
      return "VALIDATION";
    case 429:
      return "RATE_LIMIT";
    case 402:
      return "PLAN_LIMIT";
    case 409:
      return "CONFLICT";
    default:
      return "INTERNAL";
  }
}
