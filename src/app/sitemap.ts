import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { listPublished } from "@/lib/db/posts";
import { siteUrl } from "@/lib/site";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const posts = await listPublished(createPublicClient());
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...posts.map((p) => ({
      url: `${base}/m/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
