import { Bricolage_Grotesque, Manrope, Mukta, Noto_Sans_Devanagari, Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap"
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap"
});

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

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-bricolage",
  display: "swap"
});

export const authFontClass = `${sora.variable} ${manrope.variable} ${mukta.variable} ${notoDeva.variable}`;
export const marketingFontClass = `${bricolage.variable} ${mukta.variable} ${notoDeva.variable}`;
