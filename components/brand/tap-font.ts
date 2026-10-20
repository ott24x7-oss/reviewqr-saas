import { Mukta, Noto_Sans_Devanagari } from "next/font/google";

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

export const tapFontClass = `${mukta.variable} ${notoDeva.variable}`;
