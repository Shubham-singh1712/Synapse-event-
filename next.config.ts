import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@electric-sql/pglite/dist/**/*",
      "./src/lib/db/migrations/**/*",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
