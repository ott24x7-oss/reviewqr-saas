import { headers } from "next/headers";
import type { SeoLocale } from "@/lib/seo";

export function getRequestLocale(): SeoLocale {
  return headers().get("x-app-locale") === "hi" ? "hi" : "en";
}
