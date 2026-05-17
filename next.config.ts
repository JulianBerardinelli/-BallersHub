import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Match any Supabase project hostname (prod main + dev branches).
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    serverActions: {
      // Pro Assets (PNG without background) often exceed the default 1MB limit.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
