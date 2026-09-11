import { createPublicClient } from "@/lib/supabase/public";
import { listPublishedPage } from "@/lib/db/posts";
import { postTitle } from "@/lib/post-type";
import { MOODS } from "@/lib/moods";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

// Tĩnh/ISR như sitemap — client không-cookie nên trang không bị đẩy sang dynamic.
export const revalidate = 300;

// RSS chỉ mang bài MỚI NHẤT: trình đọc không cần cả archive, và listPublished()
// đọc toàn bộ bài không giới hạn (sẽ nặng dần theo năm) nên dùng bản có limit.
const FEED_LIMIT = 20;

/** Escape 5 thực thể XML — không thêm dependency chỉ để nối chuỗi. */
function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = siteUrl();
  const posts = await listPublishedPage(createPublicClient(), FEED_LIMIT);

  const items = posts
    .map((post) => {
      const url = `${base}/m/${post.slug}`;
      // Mô tả = text THUẦN (đoạn trích hoặc cảm nhận), không HTML, không nhúng ảnh:
      // giữ RSS nhẹ và không hot-link Storage.
      const description = post.excerpt || post.caption || postTitle(post);
      return [
        "    <item>",
        `      <title>${xml(postTitle(post))}</title>`,
        `      <link>${xml(url)}</link>`,
        `      <guid isPermaLink="true">${xml(url)}</guid>`,
        `      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>`,
        `      <category>${xml(MOODS[post.mood].label)}</category>`,
        `      <description>${xml(description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  // lastBuildDate theo bài mới nhất (không phải "lúc chạy"): hai lần build cùng
  // dữ liệu ra cùng một file, trình đọc không tưởng là có gì mới.
  const lastBuild = posts[0]
    ? new Date(posts[0].createdAt).toUTCString()
    : undefined;

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${xml(SITE_NAME)}</title>`,
    `    <link>${xml(base)}</link>`,
    `    <description>${xml(SITE_DESCRIPTION)}</description>`,
    "    <language>vi</language>",
    `    <atom:link href="${xml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    ...(lastBuild ? [`    <lastBuildDate>${lastBuild}</lastBuildDate>`] : []),
    ...(items ? [items] : []),
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
