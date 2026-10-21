import localFont from "next/font/local";

// Self-hosted (see scripts/build-fonts.py) so builds never depend on fonts.googleapis.com.
const sora = localFont({
  src: [
    { path: "../../fonts/sora-latin-600.woff2", weight: "600" },
    { path: "../../fonts/sora-latin-700.woff2", weight: "700" },
    { path: "../../fonts/sora-latin-800.woff2", weight: "800" }
  ],
  variable: "--font-sora",
  display: "swap"
});

const manrope = localFont({
  src: [
    { path: "../../fonts/manrope-latin-400.woff2", weight: "400" },
    { path: "../../fonts/manrope-latin-500.woff2", weight: "500" },
    { path: "../../fonts/manrope-latin-600.woff2", weight: "600" },
    { path: "../../fonts/manrope-latin-700.woff2", weight: "700" }
  ],
  variable: "--font-manrope",
  display: "swap"
});

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

const bricolage = localFont({
  src: [
    { path: "../../fonts/bricolage-grotesque-latin-500.woff2", weight: "500" },
    { path: "../../fonts/bricolage-grotesque-latin-600.woff2", weight: "600" },
    { path: "../../fonts/bricolage-grotesque-latin-700.woff2", weight: "700" }
  ],
  variable: "--font-bricolage",
  display: "swap"
});

export const authFontClass = `${sora.variable} ${manrope.variable} ${mukta.variable} ${notoDeva.variable}`;
export const marketingFontClass = `${bricolage.variable} ${mukta.variable} ${notoDeva.variable}`;
