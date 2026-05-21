import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloudflare tunnel domain in development
  allowedDevOrigins: ["cal.sibu.org.my", "*.sibu.org.my"],

  // Note: CORS headers are now handled in middleware.ts for better control
};

export default nextConfig;
