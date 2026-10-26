import { NextResponse } from "next/server";
import type { ServiceResult } from "./result";

/** Old web routes keep `{ error: string }` and their existing success JSON. */
export function legacyJson<T>(result: ServiceResult<T>) {
  if (!result.ok) {
    if (result.code === "PLAN_REQUIRED" && result.feature) {
      return NextResponse.json(
        { code: "PLAN_REQUIRED", feature: result.feature, error: result.error },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
