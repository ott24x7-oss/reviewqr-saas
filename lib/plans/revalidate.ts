import { revalidatePath } from "next/cache";

/** Pricing pages are dynamic. This drops any cached render after an admin save. */
export function revalidatePricing(slug?: string) {
  revalidatePath("/");
  revalidatePath("/pricing");
  revalidatePath("/features");
  if (slug) revalidatePath(`/plans/${slug}`);
}
