import localFont from "next/font/local";

const fraunces = localFont({
  src: "../../../fonts/fraunces-latin-500.woff2",
  weight: "500",
  variable: "--font-qr-display",
  display: "swap"
});

export const qrMarketingFonts = fraunces.variable;
