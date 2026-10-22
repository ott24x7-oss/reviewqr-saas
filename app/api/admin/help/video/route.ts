import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { storeVideo } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a video file" }, { status: 400 });
  try {
    const saved = await storeVideo(Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
