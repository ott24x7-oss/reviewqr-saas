import type { MetadataRoute } from "next";
import { getBrand } from "@/lib/brand";
import { DEFAULT_BRAND_NAME, DEFAULT_BRAND_TAGLINE } from "@/lib/brand-defaults";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getBrand().catch(() => null);
  const name = brand?.name || DEFAULT_BRAND_NAME;
  return {
    name,
    short_name: name,
    description: brand?.tagline || DEFAULT_BRAND_TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#070B12",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
