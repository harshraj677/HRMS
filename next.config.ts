import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  devIndicators: false,

  // Keep heavy native deps off the client bundle
  serverExternalPackages: ["bcrypt", "@vladmandic/face-api"],

  experimental: {
    // Tree-shake large icon / chart / animation libraries at build time
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },

  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 3600,
  },

  // Add long-lived cache headers for static assets in /public
  async headers() {
    return [
      {
        // face-api models & other static files in public/
        source: "/models/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // logo, manifest, icons
        source: "/:file(logo\\.jpg|manifest\\.json|favicon.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
