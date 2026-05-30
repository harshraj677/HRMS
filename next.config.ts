import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["bcrypt"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion", "date-fns"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/webp", "image/avif"],
  },
};

export default nextConfig;
