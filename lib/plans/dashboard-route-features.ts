import { isFeatureId, type FeatureId } from "@reviewqr/shared";

/**
 * Feature-backed owner dashboard routes. Repeated routes represent separate
 * feature sections on mixed pages such as the store settings and QR/NFC hub.
 */
export const DASHBOARD_FEATURE_ROUTES: ReadonlyArray<{ route: string; featureId: FeatureId }> = [
  { route: "/dashboard", featureId: "analytics" },
  { route: "/dashboard", featureId: "orders" },
  { route: "/dashboard", featureId: "reviews-log" },
  { route: "/dashboard", featureId: "services-booking" },
  { route: "/dashboard", featureId: "menu" },
  { route: "/dashboard", featureId: "store" },
  { route: "/dashboard", featureId: "multiple-qrs" },
  { route: "/dashboard/businesses", featureId: "reviews-log" },
  { route: "/dashboard/businesses", featureId: "multiple-qrs" },
  { route: "/dashboard/account/settings", featureId: "store" },
  { route: "/dashboard/account/settings", featureId: "staff" },
  { route: "/dashboard/account/settings", featureId: "locations" },
  { route: "/dashboard/reviews", featureId: "reviews-log" },
  { route: "/dashboard/reputation/reviews", featureId: "reviews-log" },
  { route: "/dashboard/feedback", featureId: "reviews-log" },
  { route: "/dashboard/reputation/feedback", featureId: "reviews-log" },
  { route: "/dashboard/ai", featureId: "ai-replies" },
  { route: "/dashboard/reputation/ai-replies", featureId: "ai-replies" },
  { route: "/dashboard/businesses/:id/ai", featureId: "ai-replies" },
  { route: "/dashboard/businesses/:id", featureId: "reviews-log" },
  { route: "/dashboard/businesses/:id", featureId: "locations" },
  { route: "/dashboard/businesses/:id", featureId: "staff" },
  { route: "/dashboard/businesses/:id", featureId: "multiple-qrs" },
  { route: "/dashboard/businesses/:id", featureId: "nfc" },
  { route: "/dashboard/businesses/:id", featureId: "store" },
  { route: "/dashboard/businesses/:id", featureId: "whatsapp-orders" },
  { route: "/dashboard/businesses/:id", featureId: "offers" },
  { route: "/dashboard/businesses/:id", featureId: "menu" },
  { route: "/dashboard/businesses/:id", featureId: "page-themes" },
  { route: "/dashboard/businesses/:id", featureId: "testimonials" },
  { route: "/dashboard/businesses/:id", featureId: "ai-replies" },
  { route: "/dashboard/businesses/:id", featureId: "direct-link" },
  { route: "/dashboard/businesses/:id/review-templates", featureId: "reviews-log" },
  { route: "/dashboard/page", featureId: "multiple-qrs" },
  { route: "/dashboard/page", featureId: "menu" },
  { route: "/dashboard/page", featureId: "reviews-log" },
  { route: "/dashboard/page", featureId: "page-themes" },
  { route: "/dashboard/page", featureId: "testimonials" },
  { route: "/dashboard/page", featureId: "direct-link" },
  { route: "/dashboard/page/print", featureId: "multiple-qrs" },
  { route: "/dashboard/print/paper", featureId: "multiple-qrs" },
  { route: "/dashboard/campaigns", featureId: "campaigns" },
  { route: "/dashboard/sell/campaigns", featureId: "campaigns" },
  { route: "/dashboard/customers", featureId: "customers" },
  { route: "/dashboard/sell/customers", featureId: "customers" },
  { route: "/dashboard/analytics", featureId: "analytics" },
  { route: "/dashboard/insights", featureId: "analytics" },
  { route: "/dashboard/orders", featureId: "orders" },
  { route: "/dashboard/sell/orders", featureId: "orders" },
  { route: "/dashboard/sell/bookings", featureId: "services-booking" },
  { route: "/dashboard/sell/menu", featureId: "menu" },
  { route: "/dashboard/sell/menu", featureId: "services-booking" },
  { route: "/dashboard/businesses/:id/menu", featureId: "menu" },
  { route: "/dashboard/businesses/:id/menu", featureId: "services-booking" },
  { route: "/dashboard/businesses/:id/store", featureId: "store" },
  { route: "/dashboard/businesses/:id/store", featureId: "whatsapp-orders" },
  { route: "/dashboard/businesses/:id/offers", featureId: "offers" },
  { route: "/dashboard/businesses/:id/testimonials", featureId: "testimonials" },
  { route: "/dashboard/businesses/:id/staff", featureId: "staff" },
  { route: "/dashboard/businesses/:id/locations", featureId: "locations" },
  { route: "/dashboard/businesses/:id/theme", featureId: "page-themes" },
  { route: "/dashboard/businesses/:id/tap", featureId: "direct-link" },
  { route: "/dashboard/businesses/:id/qr", featureId: "multiple-qrs" },
  { route: "/dashboard/businesses/:id/print", featureId: "multiple-qrs" },
  { route: "/dashboard/qr-codes", featureId: "multiple-qrs" },
  { route: "/dashboard/qr-codes/:code", featureId: "multiple-qrs" },
  { route: "/dashboard/page/qr", featureId: "multiple-qrs" },
  { route: "/dashboard/page/qr", featureId: "nfc" },
  { route: "/dashboard/activate", featureId: "nfc" },
  { route: "/api/v1/reports/monthly", featureId: "pdf-report" }
];

export const DASHBOARD_NAV_FEATURE_IDS = [
  "orders",
  "services-booking",
  "menu",
  "customers",
  "campaigns",
  "reviews-log",
  "ai-replies",
  "multiple-qrs",
  "analytics"
] as const satisfies readonly FeatureId[];

export function dashboardFeatureForRoute(pathname: string, preferredFeature?: FeatureId): FeatureId | null {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const match = DASHBOARD_FEATURE_ROUTES.find(({ route, featureId }) => {
    if (preferredFeature && featureId !== preferredFeature) return false;
    const pattern = route
      .split("/")
      .map((part) => part.startsWith(":") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("/");
    return new RegExp(`^${pattern}$`).test(path);
  });
  return match?.featureId ?? null;
}

export function isKnownDashboardFeatureRoute(route: string, featureId: string): featureId is FeatureId {
  return isFeatureId(featureId) && DASHBOARD_FEATURE_ROUTES.some((entry) => entry.route === route && entry.featureId === featureId);
}
