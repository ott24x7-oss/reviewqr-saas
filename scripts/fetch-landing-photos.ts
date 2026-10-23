/**
 * Download the credited landing photos and write two widths of AVIF and WebP.
 * Run: npx tsx scripts/fetch-landing-photos.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Credit = {
  id: string;
  downloadUrl?: string;
};

const root = process.cwd();
const creditsPath = path.join(root, "public", "landing", "credits.json");
const outDir = path.join(root, "public", "landing", "photos");

async function download(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "QR24x7 landing photo fetch", Accept: "image/avif,image/webp,image/*,*/*" },
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`download failed ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const credits = JSON.parse(fs.readFileSync(creditsPath, "utf8")) as { photos: Credit[] };
  fs.mkdirSync(outDir, { recursive: true });
  for (const photo of credits.photos) {
    if (!photo.downloadUrl) throw new Error(`missing downloadUrl for ${photo.id}`);
    const original = await download(photo.downloadUrl);
    for (const width of [640, 1280]) {
      const image = sharp(original).rotate().resize({ width, withoutEnlargement: true });
      await image.clone().avif({ quality: 42, effort: 4 }).toFile(path.join(outDir, `${photo.id}-${width}.avif`));
      await image.webp({ quality: 68 }).toFile(path.join(outDir, `${photo.id}-${width}.webp`));
    }
    const stat = fs.statSync(path.join(outDir, `${photo.id}-640.avif`));
    console.log(`${photo.id} 640 avif ${stat.size} bytes`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
