import fs from "node:fs";
import path from "node:path";

export type PhotoCredit = {
  id: string;
  alt: string;
  photographer: string;
  sourceUrl: string;
  licence: string;
};

export function landingPhotoCredits(): PhotoCredit[] {
  const file = path.join(process.cwd(), "public", "landing", "credits.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { photos?: PhotoCredit[] };
  return Array.isArray(data.photos) ? data.photos : [];
}
