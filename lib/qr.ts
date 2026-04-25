import QRCode from "qrcode";
import { absoluteUrl } from "./utils";

export async function generateQrDataUrl(url: string, opts: { size?: number; color?: string } = {}) {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: opts.size || 512,
    errorCorrectionLevel: "H",
    color: {
      dark: opts.color || "#1a73e8",
      light: "#ffffff"
    }
  });
}

export async function generateQrSvg(url: string, opts: { color?: string } = {}) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: opts.color || "#1a73e8",
      light: "#ffffff"
    }
  });
}

export function getReviewUrl(opts: {
  businessSlug: string;
  locationSlug?: string;
  staffSlug?: string;
  qrCode?: string;
}) {
  const params = new URLSearchParams();
  if (opts.locationSlug) params.set("l", opts.locationSlug);
  if (opts.staffSlug) params.set("s", opts.staffSlug);
  if (opts.qrCode) params.set("q", opts.qrCode);
  const query = params.toString();
  return absoluteUrl(`/r/${opts.businessSlug}${query ? `?${query}` : ""}`);
}

export function getShortReviewUrl(shortCode: string) {
  return absoluteUrl(`/q/${shortCode}`);
}
