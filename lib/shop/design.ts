import { templateById } from "../print/templates";

export type ShopDesign = {
  templateId: string;
  businessId: string;
  qrShortCode?: string | null;
  deviceId?: string | null;
  headline?: string | null;
};

export function designError(
  flags: { needsDesign: boolean; needsNfc: boolean },
  design: ShopDesign | null | undefined
): string | null {
  if (!flags.needsDesign && !flags.needsNfc) return null;
  if (!design?.businessId) return "Choose the business this item is printed for";
  if (flags.needsDesign) {
    if (!design.templateId || !templateById(design.templateId)) return "Choose a print template";
    if (!design.qrShortCode) return "Choose a QR code";
  }
  if (flags.needsNfc && !design.deviceId) return "Choose an NFC tag from your stock";
  return null;
}
