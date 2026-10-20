import { Fraunces, Hind, Mukta, Noto_Sans_Devanagari, Playfair_Display } from "next/font/google";

const mukta = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mukta",
  display: "swap"
});

const notoDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-deva",
  display: "swap"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-playfair",
  display: "swap"
});

const hind = Hind({
  subsets: ["latin", "devanagari"],
  weight: ["400", "600", "700"],
  variable: "--font-hind",
  display: "swap"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-fraunces",
  display: "swap"
});

export const tapFontClass = `${mukta.variable} ${notoDeva.variable} ${playfair.variable} ${hind.variable} ${fraunces.variable}`;
