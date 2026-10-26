import { emitPlanRequired } from "../state/plan-signal";

export class ApiError extends Error {
  status: number;
  code?: string;
  feature?: string;
  constructor(status: number, message: string, code?: string, feature?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.feature = feature;
  }
}

export async function readData<T>(res: Response, opts?: { planSheet?: boolean }): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    code?: string;
    feature?: string;
    error?: { message?: string; code?: string; feature?: string };
  };
  if (!res.ok) {
    const code = json.code || json.error?.code;
    const feature = json.feature || json.error?.feature;
    if (opts?.planSheet !== false && code === "PLAN_REQUIRED" && feature) emitPlanRequired(feature);
    throw new ApiError(res.status, json.error?.message || "Something went wrong", code, feature);
  }
  return json.data as T;
}
