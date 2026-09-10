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
    // Nền linen của hệ "Nguyên bản" (trước là #F4EEE2 — giấy của hệ "Ấn bản"
    // đã chết, làm splash PWA lệch hẳn với web). Manifest không đọc CSS token
    // nên phải hardcode; theme_color chỉ nhận 1 giá trị -> lấy bản light.
    background_color: "#FAFAFA",
    theme_color: "#FAFAFA",
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
