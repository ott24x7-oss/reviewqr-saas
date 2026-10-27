export type CategoryCatalogMode = "MENU" | "SERVICES";

export type CategoryStoreDefaults = {
  catalogMode: CategoryCatalogMode;
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
};

/** Initial catalog and order choices for businesses created through onboarding. */
export function categoryStoreDefaults(category: string | null | undefined): CategoryStoreDefaults {
  switch (category) {
    case "salon":
    case "clinic":
      return { catalogMode: "SERVICES", dineIn: false, takeaway: false, delivery: false };
    case "shop":
    case "other":
      return { catalogMode: "MENU", dineIn: false, takeaway: false, delivery: true };
    case "cafe":
    default:
      return { catalogMode: "MENU", dineIn: true, takeaway: true, delivery: false };
  }
}
