import type { FeatureId } from "@reviewqr/shared";
import type { Href } from "expo-router";
import { Building2, Link2, Palette, QrCode, Store, UtensilsCrossed, type LucideIcon } from "lucide-react-native";
import type { copy } from "../i18n/copy";
import type { RowTint } from "../ui/rows";

type Copy = (typeof copy)["en"];

export type BusinessDestination = {
  key: string;
  title: string;
  hint: string;
  href: Href;
  icon: LucideIcon;
  tint: RowTint;
  feature?: FeatureId;
};

export function businessDestinations(t: Copy): BusinessDestination[] {
  return [
    { key: "details", title: t.businessDetails, hint: t.hintLook, href: "/(app)/business-edit", icon: Building2, tint: "ink" },
    { key: "page", title: t.pageQr, hint: t.hintPageQr, href: "/(app)/tap", icon: QrCode, tint: "green" },
    { key: "menu", title: t.menuTab, hint: t.addItem, href: "/(app)/menu", icon: UtensilsCrossed, tint: "amber", feature: "menu" },
    {
      key: "buttons",
      title: t.pageButtons,
      hint: t.pageButtonsHint,
      href: { pathname: "/(app)/tap", params: { section: "buttons" } },
      icon: Link2,
      tint: "blue"
    },
    {
      key: "theme",
      title: t.pageTheme,
      hint: t.pageThemeHint,
      href: { pathname: "/(app)/tap", params: { section: "theme" } },
      icon: Palette,
      tint: "pink",
      feature: "page-themes"
    },
    { key: "store", title: t.storeSettings, hint: t.hintStoreRow, href: "/(app)/store", icon: Store, tint: "amber", feature: "store" }
  ];
}
