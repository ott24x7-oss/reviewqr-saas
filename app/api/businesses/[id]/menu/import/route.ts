import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { planDeniedResponse } from "@/lib/plans/feature-gate";
import { menuAiAccess } from "@/lib/store/menu-access";
import { rateLimitDb } from "@/lib/rate-limit";
import { getAiConfig } from "@/lib/settings";
import { generateMenuFromPhoto } from "@/lib/ai";
import { AiQuotaError } from "@/lib/entitlements";

const schema = z.object({
  image: z.string().min(32).max(6_000_000)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await menuAiAccess(user.id, params.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ("blocked" in access && access.blocked) return planDeniedResponse(access.blocked);
  const business = access.business;

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) {
    return NextResponse.json(
      { error: "Menu photo import needs an AI key. Add items by hand." },
      { status: 503 }
    );
  }

  const limit = await rateLimitDb({ key: `menu-photo:${user.id}`, limit: 10, windowSeconds: 3600 });
  if (!limit.ok) return NextResponse.json({ error: "Too many photo reads. Add items by hand for now." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose a JPEG or PNG photo" }, { status: 400 });
  const match = parsed.data.image.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return NextResponse.json({ error: "Choose a JPEG or PNG photo" }, { status: 400 });

  let image = "";
  try {
    const jpeg = await sharp(Buffer.from(match[1], "base64"))
      .rotate()
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    image = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return NextResponse.json({ error: "Could not read that photo. Add items by hand." }, { status: 400 });
  }

  try {
    const items = await generateMenuFromPhoto(cfg, image, business.id);
    if (!items.length) {
      return NextResponse.json({ error: "No dishes were found in that photo. Add items by hand." }, { status: 422 });
    }
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof AiQuotaError) return NextResponse.json({ error: error.message }, { status: 402 });
    return NextResponse.json({ error: "Could not read that photo. Add items by hand." }, { status: 502 });
  }
}
