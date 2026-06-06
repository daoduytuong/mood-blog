import type { MetadataRoute } from "next";

// PWA: "Thêm vào màn hình chính" + chạy standalone. $0 — KHÔNG service worker/push.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "khoảnh khắc của tôi",
    short_name: "khoảnh khắc",
    description:
      "Một khoảng lặng để ghi lại ảnh, nhạc và câu chuyện theo tâm trạng.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F6F8",
    theme_color: "#F2F6F8",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
