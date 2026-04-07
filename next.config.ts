import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ygansmlplzzwkjdmlqtu.supabase.co",
      },
    ],
  },
};

export default nextConfig;
