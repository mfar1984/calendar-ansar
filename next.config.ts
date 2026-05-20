import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloudflare tunnel domain in development
  allowedDevOrigins: ["cal.sibu.org.my", "*.sibu.org.my"],

  // CORS headers for API routes
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS,PROPFIND,REPORT" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Cookie, Depth" },
        ],
      },
    ];
  },
};

export default nextConfig;
