import { PLAN_CATEGORIES, fallbackImageName, planCategory } from "@/lib/plans/categories";

export function landingImageSrc(name: string) {
  return `/landing/${name}-800.webp`;
}

export function categoryImageSrc(category: string) {
  return landingImageSrc(fallbackImageName(category));
}

/** A second photo of the same category, used when the primary would repeat on a neighbour. */
export function categoryAltSrc(category: string) {
  return landingImageSrc(`${fallbackImageName(category)}-b`);
}

export type CardImageInput = {
  imageUrl: string;
  category: string;
};

/** Admin image wins. Otherwise the category photo. */
export function preferredCardSrc(input: CardImageInput) {
  const custom = input.imageUrl.trim();
  return custom || categoryImageSrc(input.category);
}

/**
 * Edge-adjacent cards in a column grid do not share a src.
 * columns is 2 on a phone and 4 on a desktop.
 */
export function assignCardImages(items: CardImageInput[], columns: number): string[] {
  const cols = Math.max(1, columns);
  const pool = PLAN_CATEGORIES.flatMap((item) => [categoryImageSrc(item.id), categoryAltSrc(item.id)]);
  const out: string[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const banned = new Set<string>();
    if (index % cols !== 0) banned.add(out[index - 1]);
    if (index >= cols) banned.add(out[index - cols]);
    const category = planCategory(items[index].category);
    const choices = [preferredCardSrc(items[index]), categoryAltSrc(category), categoryImageSrc(category), ...pool];
    out.push(choices.find((src) => !banned.has(src)) || choices[0]);
  }
  return out;
}

/** Landing files are served through LandingPicture. Anything else is a raw admin URL. */
export function pictureNameFromSrc(src: string) {
  const match = src.match(/^\/landing\/(.+)-800\.webp$/);
  return match ? match[1] : null;
}
