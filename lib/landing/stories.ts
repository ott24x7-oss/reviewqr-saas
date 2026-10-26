import fs from "node:fs";
import path from "node:path";

export type OwnerStory = {
  name: string;
  business: string;
  city: string;
  quote: string;
  photo: string;
  rating: number;
};

/** Real owner stories only. An empty file hides the social-proof section. */
export function landingStories(): OwnerStory[] {
  const file = path.join(process.cwd(), "public", "landing", "testimonials.json");
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { stories?: OwnerStory[] };
  if (!Array.isArray(data.stories)) return [];
  return data.stories.filter(
    (story) =>
      story.name &&
      story.business &&
      story.city &&
      story.quote &&
      story.photo &&
      story.rating > 0
  );
}
