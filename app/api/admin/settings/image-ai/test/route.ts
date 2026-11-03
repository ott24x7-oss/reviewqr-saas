import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { generateItemImage } from "@/lib/ai-images";
import { getImageAiConfig } from "@/lib/settings";
import { storeUpload } from "@/lib/storage";
import { rateLimitDb } from "@/lib/rate-limit";
import { AiQuotaError } from "@/lib/entitlements";

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const rate = await rateLimitDb({ key: `admin-image-ai-test:${guard.user.id}`, limit: 3, windowSeconds: 3600 });
  if (!rate.ok) return NextResponse.json({ error: "Image test limit reached for this hour" }, { status: 429 });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const stored = await getImageAiConfig();
  const cfg = {
    ...stored,
    enabled: true,
    apiUrl: String(body.apiUrl || stored.apiUrl).trim().replace(/\/$/, ""),
    apiKey: typeof body.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : stored.apiKey,
    model: String(body.model || stored.model),
    size: String(body.size || stored.size),
    stylePrompt: String(body.stylePrompt || stored.stylePrompt)
  };
  try {
    const bytes = await generateItemImage(cfg, { name: "Sample product", category: "Product photo" });
    const image = await storeUpload({ bytes, variant: "cover" });
    return NextResponse.json({ ok: true, url: image.url });
  } catch (error) {
    const message = error instanceof AiQuotaError ? error.message : error instanceof Error ? error.message : "Image test failed";
    return NextResponse.json({ ok: false, error: message }, { status: error instanceof AiQuotaError ? 402 : 400 });
  }
}
