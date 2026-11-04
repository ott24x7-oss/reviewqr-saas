import { ImageResponse } from "next/og";

export const runtime = "edge";
export const revalidate = 86400;

const origin = (process.env.NEXT_PUBLIC_APP_URL || "https://qr24x7.in").replace(/\/$/, "");
const logoAssetUrl = new URL("../../../public/brand/logo-mark.png", import.meta.url);
const hindiFontUrl = new URL("../../../public/fonts/og-noto-sans-devanagari-600.ttf", import.meta.url);
const latinFontUrl = new URL("../../../public/fonts/og-geist-latin-400.ttf", import.meta.url);
let logoData: Promise<string> | undefined;
let hindiFont: Promise<ArrayBuffer> | undefined;
let latinFont: Promise<ArrayBuffer> | undefined;

function fontAsset(url: URL, file: string) {
  return fetch(url, { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) throw new Error(`OG font not found: ${file}`);
    return response.arrayBuffer();
  });
}

function asset(url: URL, mime: string) {
  return fetch(url, { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) throw new Error("OG logo asset not found");
    const data = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (const byte of data) binary += String.fromCharCode(byte);
    return `data:${mime};base64,${btoa(binary)}`;
  });
}

function safeText(value: string | null, fallback: string, max: number) {
  return (value || fallback).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const locale = params.get("locale") === "hi" ? "hi" : "en";
  const title = safeText(params.get("title"), locale === "hi" ? "QR24x7 से अपना कारोबार बढ़ाएँ" : "Grow your business with QR24x7", 140);
  const context = safeText(params.get("context"), locale === "hi" ? "रिव्यू · मेनू · WhatsApp ऑर्डर" : "Google reviews · Menus · WhatsApp orders", 90);
  logoData ||= asset(logoAssetUrl, "image/png");
  const logo = await logoData;
  const fonts = [{
    name: locale === "hi" ? "Noto Sans Devanagari" : "Geist",
    data: locale === "hi"
      ? await (hindiFont ||= fontAsset(hindiFontUrl, "Hindi"))
      : await (latinFont ||= fontAsset(latinFontUrl, "Latin")),
    weight: (locale === "hi" ? 600 : 400) as 600 | 400,
    style: "normal" as const
  }];

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 64px", background: "#f4efe6", color: "#1c1813", fontFamily: locale === "hi" ? "Noto Sans Devanagari" : "Geist" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <img src={logo} alt="" width="54" height="54" style={{ borderRadius: 12 }} />
        <span style={{ fontSize: 30, fontWeight: 700 }}>QR24x7</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000 }}>
        <div style={{ width: 72, height: 6, borderRadius: 8, background: "#15803d" }} />
        <div style={{ fontSize: title.length > 65 ? 48 : 58, lineHeight: 1.18, fontWeight: 600, letterSpacing: "-1.2px" }}>{title}</div>
        <div style={{ display: "flex", alignSelf: "flex-start", borderRadius: 24, background: "#e3eadd", color: "#14532d", padding: "12px 18px", fontSize: 23 }}>{context}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#625d54", fontSize: 20 }}>
        <span>{locale === "hi" ? "भारत के स्थानीय कारोबार के लिए" : "Built for local businesses in India"}</span>
        <span>{origin.replace(/^https?:\/\//, "")}</span>
      </div>
    </div>,
    { width: 1200, height: 630, fonts }
  );
}
