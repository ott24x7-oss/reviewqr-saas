/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets the e2e OTP dev server build into its own folder so it does not
  // overwrite the production build that the owner smoke test runs against.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  transpilePackages: ["@reviewqr/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" }
    ]
  },
  experimental: {
    instrumentationHook: true,
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.up.railway.app", "*.railway.app"]
    },
    serverComponentsExternalPackages: ["@whiskeysockets/baileys", "pino", "sharp", "@aws-sdk/client-s3", "exceljs"]
  },
  async redirects() {
    return [
      { source: "/dashboard/orders", destination: "/dashboard/sell/orders", permanent: true },
      { source: "/dashboard/customers", destination: "/dashboard/sell/customers", permanent: true },
      { source: "/dashboard/campaigns", destination: "/dashboard/sell/campaigns", permanent: true },
      { source: "/dashboard/reviews", destination: "/dashboard/reputation/reviews", permanent: true },
      { source: "/dashboard/feedback", destination: "/dashboard/reputation/feedback", permanent: true },
      { source: "/dashboard/ai", destination: "/dashboard/reputation/ai-replies", permanent: true },
      { source: "/dashboard/analytics", destination: "/dashboard/insights", permanent: true },
      { source: "/dashboard/billing", destination: "/dashboard/account/plan", permanent: true },
      { source: "/dashboard/refer", destination: "/dashboard/account/refer", permanent: true },
      { source: "/dashboard/settings", destination: "/dashboard/account/settings", permanent: true },
      { source: "/dashboard/help", destination: "/dashboard/account/help", permanent: true },
      { source: "/dashboard/onboarding", destination: "/dashboard/account/settings?section=business-details&new=1", permanent: true },
      { source: "/dashboard/qr-codes/:code", destination: "/dashboard/page/qr?tab=detail&code=:code", permanent: true },
      { source: "/dashboard/qr-codes", destination: "/dashboard/page/qr", permanent: true },
      { source: "/dashboard/activate", destination: "/dashboard/page/qr?tab=activate", permanent: true },
      { source: "/dashboard/print/paper", destination: "/dashboard/page/print?tab=paper", permanent: true },
      { source: "/dashboard/shop/orders/:orderId", destination: "/dashboard/page/print?tab=order&orderId=:orderId", permanent: true },
      { source: "/dashboard/shop/orders", destination: "/dashboard/page/print?tab=orders", permanent: true },
      { source: "/dashboard/shop/cart", destination: "/dashboard/page/print?tab=cart", permanent: true },
      { source: "/dashboard/shop/commission", destination: "/dashboard/account/refer?tab=hardware", permanent: true },
      { source: "/dashboard/shop/:slug", destination: "/dashboard/page/print?tab=product&slug=:slug", permanent: true },
      { source: "/dashboard/shop", destination: "/dashboard/page/print?tab=shop", permanent: true },
      { source: "/dashboard/businesses/:businessId/edit", destination: "/dashboard/account/settings?section=business-details&businessId=:businessId", permanent: true },
      { source: "/dashboard/businesses/:businessId/locations", destination: "/dashboard/account/settings?section=locations&businessId=:businessId", permanent: true },
      { source: "/dashboard/businesses/:businessId/store", destination: "/dashboard/account/settings?section=store&businessId=:businessId", permanent: true },
      { source: "/dashboard/businesses/:businessId/staff", destination: "/dashboard/account/settings?section=staff&businessId=:businessId", permanent: true },
      { source: "/dashboard/businesses/:businessId/menu", destination: "/dashboard/sell/menu?businessId=:businessId", permanent: true },
      { source: "/dashboard/businesses/:businessId/offers", destination: "/dashboard/sell/campaigns?businessId=:businessId&tab=offers", permanent: true },
      { source: "/dashboard/businesses/:businessId/qr", destination: "/dashboard/page/qr?businessId=:businessId&tab=create", permanent: true },
      { source: "/dashboard/businesses/:businessId/print", destination: "/dashboard/page/print?businessId=:businessId", permanent: true },
      { source: "/dashboard/businesses/:businessId/tap", destination: "/dashboard/page?businessId=:businessId&tab=buttons", permanent: true },
      { source: "/dashboard/businesses/:businessId/theme", destination: "/dashboard/page?businessId=:businessId&tab=theme", permanent: true },
      { source: "/dashboard/businesses/:businessId/testimonials", destination: "/dashboard/page?businessId=:businessId&tab=testimonials", permanent: true },
      { source: "/dashboard/businesses/:businessId/review-templates", destination: "/dashboard/reputation/reviews?businessId=:businessId&tab=templates", permanent: true },
      { source: "/dashboard/businesses/:businessId/ai", destination: "/dashboard/reputation/ai-replies?businessId=:businessId", permanent: true },
      { source: "/dashboard/businesses/new", destination: "/dashboard/account/settings?section=business-details&new=1", permanent: true },
      { source: "/dashboard/businesses/:businessId", destination: "/dashboard/page?businessId=:businessId", permanent: true },
      { source: "/dashboard/businesses", destination: "/dashboard/account/settings?section=businesses", permanent: true }
    ];
  },
  async headers() {
    const security = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "origin-when-cross-origin" },
      { key: "X-XSS-Protection", value: "1; mode=block" }
    ];
    const hsts =
      process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" }]
        : [];
    return [
      {
        source: "/api/health",
        headers: security
      },
      {
        source: "/((?!api/health$).*)",
        headers: [...security, ...hsts]
      },
      {
        source: "/api/widget/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET" }
        ]
      }
    ];
  }
};

export default nextConfig;
