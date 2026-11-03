import localFont from "next/font/local";

const fraunces = localFont({
  src: [
    { path: "../../../fonts/fraunces-latin-500.woff2", weight: "500" },
    { path: "../../../fonts/fraunces-latin-700.woff2", weight: "700" }
  ],
  variable: "--font-qr-display",
  display: "swap"
});

export const qrMarketingFonts = fraunces.variable;
