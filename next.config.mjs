/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" }
    ]
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.up.railway.app", "*.railway.app"]
    },
    serverComponentsExternalPackages: ["@whiskeysockets/baileys", "pino", "sharp", "@aws-sdk/client-s3", "exceljs"]
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
