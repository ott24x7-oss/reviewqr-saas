import localFont from "next/font/local";

const bricolage = localFont({
  src: [
    { path: "../../fonts/bricolage-grotesque-latin-500.woff2", weight: "500" },
    { path: "../../fonts/bricolage-grotesque-latin-600.woff2", weight: "600" },
    { path: "../../fonts/bricolage-grotesque-latin-700.woff2", weight: "700" }
  ],
  variable: "--font-bricolage",
  display: "swap"
});

const geist = localFont({
  src: [
    { path: "../../fonts/geist-latin-400.woff2", weight: "400" },
    { path: "../../fonts/geist-latin-600.woff2", weight: "600" }
  ],
  variable: "--font-geist",
  display: "swap"
});

/** Headings and body for the non-Classic storefronts. Hindi falls back to Mukta and Noto. */
export const storeDesignFontClass = `${bricolage.variable} ${geist.variable}`;
