import { NextRequest, NextResponse } from "next/server";
import { requireV1User } from "@/lib/api/v1";
import { rateLimitDb } from "@/lib/rate-limit";
import { commitMenuBulk, getMenuImportImageJobs, previewMenuBulk } from "@/lib/store/menu-bulk";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const ids = (req.nextUrl.searchParams.get("imageJobIds") || "").split(",").filter(Boolean);
  const jobs = await getMenuImportImageJobs(auth.user.id, params.id, ids);
  if (!jobs) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
  return NextResponse.json({ data: { jobs } });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const rate = await rateLimitDb({ key: `menu-bulk:${auth.user.id}`, limit: 20, windowSeconds: 3600 });
  if (!rate.ok) return NextResponse.json({ error: { code: "RATE_LIMIT", message: "Too many bulk imports. Try again later." } }, { status: 429 });
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: { code: "VALIDATION", message: "Choose a CSV or Excel file" } }, { status: 400 });
    if (file.size > 2_000_000) return NextResponse.json({ error: { code: "VALIDATION", message: "Choose a file under 2 MB" } }, { status: 413 });
    const result = await previewMenuBulk(auth.user.id, params.id, Buffer.from(await file.arrayBuffer()), file.name);
    if ("error" in result) return NextResponse.json({ error: { code: "IMPORT", message: result.error } }, { status: result.status });
    return NextResponse.json({ data: result.preview });
  }
  const body = await req.json().catch(() => null) as null | {
    rows?: unknown; actions?: Array<{ index: number; action: "add" | "update" | "skip" }>; mode?: "add_new" | "update_existing";
  };
  if (!body) return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid import request" } }, { status: 400 });
  const result = await commitMenuBulk(auth.user.id, params.id, body.rows, Array.isArray(body.actions) ? body.actions : [], body.mode === "update_existing" ? "update_existing" : "add_new");
  if ("error" in result) return NextResponse.json({ error: { code: "IMPORT", message: result.error } }, { status: result.status });
  return NextResponse.json({ data: result });
}
