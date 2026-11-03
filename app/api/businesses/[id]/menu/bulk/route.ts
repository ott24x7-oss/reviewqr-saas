import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimitDb } from "@/lib/rate-limit";
import { commitMenuBulk, getMenuImportImageJobs, previewMenuBulk } from "@/lib/store/menu-bulk";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ids = (req.nextUrl.searchParams.get("imageJobIds") || "").split(",").filter(Boolean);
  const jobs = await getMenuImportImageJobs(user.id, params.id, ids);
  if (!jobs) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rate = await rateLimitDb({ key: `menu-bulk:${user.id}`, limit: 20, windowSeconds: 3600 });
  if (!rate.ok) return NextResponse.json({ error: "Too many bulk imports. Try again later." }, { status: 429 });

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV or Excel file" }, { status: 400 });
    if (file.size > 2_000_000) return NextResponse.json({ error: "Choose a file under 2 MB" }, { status: 413 });
    const result = await previewMenuBulk(user.id, params.id, Buffer.from(await file.arrayBuffer()), file.name);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.preview);
  }

  const body = await req.json().catch(() => null) as null | {
    rows?: unknown; actions?: Array<{ index: number; action: "add" | "update" | "skip" }>;
    mode?: "add_new" | "update_existing";
  };
  if (!body) return NextResponse.json({ error: "Invalid import request" }, { status: 400 });
  const result = await commitMenuBulk(
    user.id, params.id, body.rows, Array.isArray(body.actions) ? body.actions : [],
    body.mode === "update_existing" ? "update_existing" : "add_new"
  );
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
