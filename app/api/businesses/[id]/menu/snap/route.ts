import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { rateLimitDb } from "@/lib/rate-limit";
import { getAiConfig } from "@/lib/settings";
import { readProductPhoto } from "@/lib/ai";
import { AiQuotaError } from "@/lib/entitlements";

const schema = z.object({
  image: z.string().min(32).max(6_000_000)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) {
    return NextResponse.json(
      { error: "A suggestion isn't available right now. You can type it yourself." },
      { status: 503 }
    );
  }
  const limit = await rateLimitDb({ key: `menu-snap:${user.id}`, limit: 10, windowSeconds: 3600 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many photo reads. Type this product by hand for now." }, { status: 429 });
  }

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
    return NextResponse.json({ error: "Could not read that photo. Type the name and price." }, { status: 400 });
  }

  try {
    const item = await readProductPhoto(cfg, image, business.id);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof AiQuotaError) return NextResponse.json({ error: error.message }, { status: 402 });
    return NextResponse.json({ error: "Could not read that photo. Type the name and price." }, { status: 502 });
  }
}
