import { NextResponse } from "next/server";
import type { ServiceResult } from "./result";

/** Old web routes keep `{ error: string }` and their existing success JSON. */
export function legacyJson<T>(result: ServiceResult<T>) {
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
