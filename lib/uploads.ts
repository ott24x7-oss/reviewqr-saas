import { rateLimitDb } from "./rate-limit";
import { fail, ok } from "./api/result";
import { storeUpload, type ImageVariant } from "./storage";

export async function receiveUpload(userId: string, file: unknown, variantRaw: unknown) {
  const rl = await rateLimitDb({ key: `upload:${userId}`, limit: 30, windowSeconds: 600 });
  if (!rl.ok) return fail(429, "Too many uploads. Try again shortly.");
  if (!(file instanceof File)) return fail(400, "Choose an image file");
  if (file.size > 8 * 1024 * 1024) return fail(400, "Image too large (max 8MB)");
  const variant: ImageVariant = variantRaw === "cover" ? "cover" : "logo";
  try {
    const saved = await storeUpload({
      bytes: Buffer.from(await file.arrayBuffer()),
      variant
    });
    return ok(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not store image";
    return fail(400, message);
  }
}
