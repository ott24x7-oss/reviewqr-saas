import localFont from "next/font/local";
import { marketingFontClass } from "@/components/brand/fonts";

const fraunces = localFont({
  src: [
    { path: "../../../fonts/fraunces-latin-500.woff2", weight: "500" },
    { path: "../../../fonts/fraunces-latin-700.woff2", weight: "700" }
  ],
  variable: "--font-fraunces",
  display: "swap"
});

/** Home only. Other marketing pages keep marketingFontClass. */
export const homeFontClass = `${marketingFontClass} ${fraunces.variable}`;
