import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  // Ghim workspace root vào thư mục dự án (tránh Turbopack suy luận nhầm sang thư mục cha).
  turbopack: { root: process.cwd() },
  images: {
    // Next 16: dùng remotePatterns (images.domains đã deprecated). Ảnh phục vụ từ Supabase Storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Ảnh đã resize phía client (≤2048px webp) nên nhỏ; nâng limit cho an toàn (mặc định 1MB).
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
