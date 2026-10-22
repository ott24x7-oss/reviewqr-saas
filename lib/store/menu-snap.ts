import sharp from "sharp";
import { z } from "zod";
import { readProductPhoto } from "../ai";
import { fail, ok } from "../api/result";
import { AiQuotaError } from "../entitlements";
import { moduleBlock } from "../plans/entitlements";
import { rateLimitDb } from "../rate-limit";
import { getAiConfig } from "../settings";
import { requireBusinessRole } from "../tenant";

const schema = z.object({
  image: z.string().min(32).max(6_000_000)
});

/** Reads one product photo. The caller has already authenticated the user. */
export async function snapMenuPhoto(userId: string, businessId: string, raw: unknown) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return fail(404, "Not found");
  const locked = await moduleBlock(business.ownerId, "MENU");
  if (locked) return fail(403, locked);

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) {
    return fail(503, "A suggestion isn't available right now. You can type it yourself.");
  }
  const limit = await rateLimitDb({ key: `menu-snap:${userId}`, limit: 10, windowSeconds: 3600 });
  if (!limit.ok) return fail(429, "Too many photo reads. Type this product by hand for now.");

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(400, "Choose a JPEG or PNG photo");
  const match = parsed.data.image.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return fail(400, "Choose a JPEG or PNG photo");

  let image = "";
  try {
    const jpeg = await sharp(Buffer.from(match[1], "base64"))
      .rotate()
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    image = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return fail(400, "Could not read that photo. Type the name and price.");
  }

  try {
    const item = await readProductPhoto(cfg, image, business.id);
    return ok({ item });
  } catch (error) {
    if (error instanceof AiQuotaError) return fail(402, error.message);
    return fail(502, "Could not read that photo. Type the name and price.");
  }
}
