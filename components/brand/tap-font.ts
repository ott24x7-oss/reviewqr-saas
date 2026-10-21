import localFont from "next/font/local";

// Self-hosted (see scripts/build-fonts.py) so builds never depend on fonts.googleapis.com.
const mukta = localFont({
  src: [
    { path: "../../fonts/mukta-latin-devanagari-400.woff2", weight: "400" },
    { path: "../../fonts/mukta-latin-devanagari-500.woff2", weight: "500" },
    { path: "../../fonts/mukta-latin-devanagari-600.woff2", weight: "600" },
    { path: "../../fonts/mukta-latin-devanagari-700.woff2", weight: "700" }
  ],
  variable: "--font-mukta",
  display: "swap"
});

const notoDeva = localFont({
  src: [
    { path: "../../fonts/noto-sans-devanagari-latin-devanagari-400.woff2", weight: "400" },
    { path: "../../fonts/noto-sans-devanagari-latin-devanagari-600.woff2", weight: "600" },
    { path: "../../fonts/noto-sans-devanagari-latin-devanagari-700.woff2", weight: "700" }
  ],
  variable: "--font-noto-deva",
  display: "swap"
});

const playfair = localFont({
  src: [
    { path: "../../fonts/playfair-display-latin-500.woff2", weight: "500" },
    { path: "../../fonts/playfair-display-latin-700.woff2", weight: "700" }
  ],
  variable: "--font-playfair",
  display: "swap",
  adjustFontFallback: "Times New Roman"
});

const hind = localFont({
  src: [
    { path: "../../fonts/hind-latin-devanagari-400.woff2", weight: "400" },
    { path: "../../fonts/hind-latin-devanagari-600.woff2", weight: "600" },
    { path: "../../fonts/hind-latin-devanagari-700.woff2", weight: "700" }
  ],
  variable: "--font-hind",
  display: "swap"
});

const fraunces = localFont({
  src: [
    { path: "../../fonts/fraunces-latin-500.woff2", weight: "500" },
    { path: "../../fonts/fraunces-latin-700.woff2", weight: "700" }
  ],
  variable: "--font-fraunces",
  display: "swap",
  adjustFontFallback: "Times New Roman"
});

export const tapFontClass = `${mukta.variable} ${notoDeva.variable} ${playfair.variable} ${hind.variable} ${fraunces.variable}`;
