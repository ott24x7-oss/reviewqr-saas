import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { BackgroundFX } from "@/components/ui/background-fx";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import { getBrand } from "@/lib/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap"
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand().catch(() => ({
    name: "ReviewQR",
    logoUrl: "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    supportEmail: "hello@reviewqr.in",
    tagline: "Turn happy customers into Google reviews."
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
    { media: "(prefers-color-scheme: dark)", color: "#05070f" },
    { media: "(prefers-color-scheme: light)", color: "#05070f" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="midnight"
      className={`dark ${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <SmoothScroll />
        <BackgroundFX />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
