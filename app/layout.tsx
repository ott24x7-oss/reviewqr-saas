import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { ShapeGridGate } from "@/components/ui/shape-grid-gate";
import { getBrand } from "@/lib/brand";
import "./globals.css";

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

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand().catch(() => ({
    name: "ReviewQR",
    logoUrl: "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    supportEmail: "hello@reviewqr.in",
    tagline: "Turn happy customers into Google & Trustpilot reviews."
  }));

  const fullTitle = `${brand.name} — ${brand.tagline}`;
  const ogImages = brand.logoUrl && brand.logoUrl.startsWith("http") ? [brand.logoUrl] : undefined;

  return {
    metadataBase: new URL(brand.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    title: {
      default: fullTitle,
      template: `%s | ${brand.name}`
    },
    description: brand.tagline,
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
      description: brand.tagline,
      siteName: brand.name,
      images: ogImages
    },
    robots: { index: true, follow: true },
    icons: {
      icon: brand.logoUrl
        ? [{ url: brand.logoUrl }]
        : [{ url: "/favicon.svg", type: "image/svg+xml" }]
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
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
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
