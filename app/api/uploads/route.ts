import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimitDb } from "@/lib/rate-limit";
import { storeUpload, type ImageVariant } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimitDb({ key: `upload:${user.id}`, limit: 30, windowSeconds: 600 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many uploads. Try again shortly." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 8MB)" }, { status: 400 });
  }

  const variant: ImageVariant = form?.get("variant") === "cover" ? "cover" : "logo";
  try {
    const saved = await storeUpload({
      bytes: Buffer.from(await file.arrayBuffer()),
      variant
    });
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not store image";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
