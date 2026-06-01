import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.119", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.mojprilep.mk",
      },
      {
        protocol: "https",
        hostname: "mojprilep.mk",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
    // Serve modern formats with smaller payloads
    formats: ["image/avif", "image/webp"],
    // Common breakpoints — Next picks the smallest needed for the device
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 64, 96, 128, 160, 256, 384],
    // Cache optimized images for 30 days
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
