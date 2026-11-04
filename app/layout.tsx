import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { ShapeGridGate } from "@/components/ui/shape-grid-gate";
import { getBrand } from "@/lib/brand";
import { DEFAULT_BRAND_NAME, DEFAULT_BRAND_TAGLINE } from "@/lib/brand-defaults";
import { BRAND_APPLE, BRAND_FAVICON, BRAND_OG } from "@/lib/brand-assets";
import { DEFAULT_SEO_CONFIG, getSeoConfig } from "@/lib/settings";
import "./globals.css";
import "@/components/marketing/qr-site/qr-site.css";

// Self-hosted (see scripts/build-fonts.py) so builds never depend on fonts.googleapis.com.
const inter = localFont({
  src: "../fonts/inter-latin-var.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap"
});
const poppins = localFont({
  src: [
    { path: "../fonts/poppins-latin-400.woff2", weight: "400" },
    { path: "../fonts/poppins-latin-500.woff2", weight: "500" },
    { path: "../fonts/poppins-latin-600.woff2", weight: "600" },
    { path: "../fonts/poppins-latin-700.woff2", weight: "700" },
    { path: "../fonts/poppins-latin-800.woff2", weight: "800" }
  ],
  variable: "--font-display",
  display: "swap"
});
const devanagari = localFont({
  src: [
    { path: "../fonts/noto-sans-devanagari-latin-devanagari-400.woff2", weight: "400" },
    { path: "../fonts/noto-sans-devanagari-latin-devanagari-600.woff2", weight: "600" },
    { path: "../fonts/noto-sans-devanagari-latin-devanagari-700.woff2", weight: "700" }
  ],
  variable: "--font-devanagari",
  display: "swap"
});

export async function generateMetadata(): Promise<Metadata> {
  const [brand, seo] = await Promise.all([getBrand().catch(() => ({
    name: DEFAULT_BRAND_NAME,
    logoUrl: "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    supportEmail: "hello@qr24x7.in",
    tagline: DEFAULT_BRAND_TAGLINE
  })), getSeoConfig().catch(() => DEFAULT_SEO_CONFIG)]);

  const fullTitle = `QR Review, Menu & WhatsApp Orders | ${brand.name}`;
  const ogImages =
    brand.logoUrl && brand.logoUrl.startsWith("http")
      ? [brand.logoUrl]
      : [{ url: BRAND_OG, width: 1200, height: 630, alt: brand.name }];

  return {
    metadataBase: new URL(brand.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    title: { default: fullTitle, template: seo.defaultTitleTemplate || `%s | ${brand.name}` },
    description: seo.defaultDescriptionEn,
    keywords: [
      "google reviews",
      "review qr code",
      "feedback",
      "small business india",
      "review management",
      "saas india"
    ],
    openGraph: {
      type: "website",
      title: fullTitle,
      description: seo.defaultDescriptionEn,
      siteName: brand.name,
      images: ogImages
    },
    verification: {
      ...(seo.verification.google ? { google: seo.verification.google } : {}),
      ...(seo.verification.bing ? { other: { "msvalidate.01": seo.verification.bing } } : {}),
      ...(seo.verification.yandex ? { yandex: seo.verification.yandex } : {})
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: seo.defaultDescriptionEn, images: ogImages },
    icons: {
      icon: [
        { url: BRAND_FAVICON },
        { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
        { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/brand/favicon-48.png", sizes: "48x48", type: "image/png" }
      ],
      apple: [{ url: BRAND_APPLE, sizes: "180x180", type: "image/png" }]
    }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a73e8" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = headers().get("x-app-locale") === "hi" ? "hi" : "en";
  return (
    <html lang={locale} className={`${inter.variable} ${poppins.variable} ${devanagari.variable}`}>
      <body className="min-h-screen bg-[#eef1f6] font-sans antialiased">
        <ShapeGridGate />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
