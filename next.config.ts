import type { NextConfig } from "next";

// Images uploaded to Supabase Storage (event, site and avatar images).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
  // Old addresses kept working with real HTTP redirects.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/tickets", permanent: true },
      { source: "/check-in", destination: "/admin/check-in", permanent: true },
    ];
  },
};

export default nextConfig;
