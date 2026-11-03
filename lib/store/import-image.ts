import { prisma } from "../db";
import { assertSafeOutboundUrl } from "../ssrf";
import { storeUpload } from "../storage";
import { detectRaster } from "../images";
import { readLimited } from "../read-limited";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function downloadImportedImage(input: { businessId: string; itemId: string; imageUrl: string }) {
  let url = input.imageUrl;
  let response: Response | null = null;
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (new URL(url).protocol !== "https:") throw new Error("Image URL must use HTTPS");
    await assertSafeOutboundUrl(url);
    response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { accept: "image/png,image/jpeg,image/webp" }
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) throw new Error("Image URL redirected too many times");
      url = new URL(location, url).toString();
      continue;
    }
    break;
  }
  if (!response?.ok) throw new Error(`Image download failed (${response?.status || "network"})`);
  const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!IMAGE_TYPES.has(type)) throw new Error("Image must be PNG, JPEG, or WebP");
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_IMAGE_BYTES) throw new Error("Image exceeds 5 MB");
  const bytes = await readLimited(response, MAX_IMAGE_BYTES, "Image exceeds 5 MB");
  const raster = detectRaster(bytes);
  const actualType = raster === "jpg" ? "image/jpeg" : raster ? `image/${raster}` : "";
  if (!actualType || actualType !== type || raster === "gif") throw new Error("Image must be a matching PNG, JPEG, or WebP file");
  const stored = await storeUpload({ bytes, variant: "cover" });
  const update = await prisma.menuItem.updateMany({
    where: { id: input.itemId, businessId: input.businessId },
    data: { photo: stored.url }
  });
  if (!update.count) throw new Error("Item was removed");
  return { url: stored.url };
}
