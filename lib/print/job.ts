import type { EyeStyle, ModuleStyle } from "./design";

export const PRINT_JOB_KEY = "rq-print-job";

export type HindiFont = "mukta" | "noto";

export type PrintJob = {
  templateId: string;
  name: string;
  cta: string;
  ctaHi: string;
  hindiFont: HindiFont;
  background: string;
  backgroundTo: string;
  foreground: string;
  qrDark: string;
  qrDarkTo: string;
  qrLight: string;
  module: ModuleStyle;
  eye: EyeStyle;
  showNfc: boolean;
  showStars: boolean;
  qrMm: number;
  code: string;
  label: string;
  logo?: string;
  backgroundImage?: string;
};

export function readDataUrl(value: string | undefined) {
  if (!value) return undefined;
  const raw = value.includes(",") ? value.split(",")[1] : value;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
