import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { listPublished } from "@/lib/db/posts";
import { siteUrl } from "@/lib/site";
import { MOOD_CODES, moodPath } from "@/lib/moods";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const posts = await listPublished(createPublicClient());
  // Chỉ liệt kê trang lọc của tâm trạng THẬT SỰ có bài — 6 URL rỗng trong
  // sitemap là 6 trang mỏng, không có lợi gì cho tìm kiếm.
  const moodsWithPosts = MOOD_CODES.filter((code) =>
    posts.some((p) => p.mood === code),
  );

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/gioi-thieu`, changeFrequency: "yearly", priority: 0.4 },
    ...(posts.length > 0
      ? [
          {
            url: `${base}/lich`,
            changeFrequency: "weekly" as const,
            priority: 0.5,
          },
        ]
      : []),
    ...moodsWithPosts.map((code) => ({
      url: `${base}${moodPath(code)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...posts.map((p) => ({
      url: `${base}/m/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
