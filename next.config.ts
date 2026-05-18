import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Match any Supabase project hostname (prod main + dev branches).
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // Prefer AVIF for the smallest payload, fall back to WebP. The Next
    // image optimizer negotiates per-request based on Accept headers.
    formats: ["image/avif", "image/webp"],
    // Optimized images are cached at the edge for this long before the
    // optimizer re-runs. 7 days fits avatars / team crests / banners
    // that rarely change. Browsers honor max-age from headers anyway,
    // and any cache-busting use case lives outside next/image.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  experimental: {
    serverActions: {
      // Pro Assets (PNG without background) often exceed the default 1MB limit.
      bodySizeLimit: "10mb",
    },
    // Tree-shake barrel imports from these libraries. Without this,
    // `import { Button, Card } from "@heroui/react"` arrastra el barrel
    // completo. With this, Next strips the unused exports per file at
    // build time. Most impact comes from @heroui/react (93 imports
    // across the codebase) and lucide-react (every icon import).
    optimizePackageImports: [
      "@heroui/react",
      "lucide-react",
      "framer-motion",
    ],
  },
};

// Vercel BotID — wraps the config to inject the proxy rewrites that
// keep the bot-challenge JS reachable even when ad-blockers/extensions
// try to strip third-party scripts. See instrumentation-client.ts for
// the per-route protect list and src/app/api/{onboarding,portfolio}
// for the server-side `checkBotId()` enforcement.
export default withBotId(nextConfig);
