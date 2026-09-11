// Tên + mô tả site — dùng CHUNG cho metadata ở layout và kênh RSS, để hai chỗ
// không trôi khỏi nhau (đổi một nơi là đổi cả hai).
export const SITE_NAME = "khoảnh khắc của tôi";
export const SITE_DESCRIPTION =
  "Một khoảng lặng để ghi lại ảnh, nhạc và câu chuyện theo tâm trạng.";

// URL gốc của site cho metadataBase / OG / sitemap (absolute URL).
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://mood-blog-phi.vercel.app";
}
