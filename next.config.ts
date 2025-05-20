import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Clerk-hosted images (for avatars, logos, etc.)
  images: {
    domains: ["images.clerk.dev", "www.clerk.dev"],
  },
};

export default nextConfig;
