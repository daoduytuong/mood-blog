import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getBySlug, listSlugs } from "@/lib/db/posts";
import { mediaPublicUrl } from "@/lib/storage";
import { siteUrl } from "@/lib/site";
import { MoodBar, MoodLabel } from "@/components/post/MoodBar";
import { HeartButton } from "@/features/hearts/HeartButton";
import { VideoEmbed } from "@/components/ui/VideoEmbed";

export const revalidate = 300;
export const dynamicParams = true; // slug mới (chưa pre-render) -> render on-demand, không 404

// SSG các bài đã có (Next 16: generateStaticParams không chạy lại lúc revalidate).
export async function generateStaticParams() {
  const slugs = await listSlugs(createPublicClient());
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBySlug(createPublicClient(), slug);
  if (!post) return {};

  const title =
    post.caption ||
    post.excerpt ||
    (post.type === "khoanh_khac" ? "Một khoảnh khắc" : "Một góc đọc");
  const description =
    (post.excerpt || post.caption || "").slice(0, 200) || undefined;
  const imgPath = post.media[0]?.path;
  // Khoảnh khắc-ảnh: og:image = ảnh. Góc đọc/video: OG ảnh động để 1 nhịp sau (next/og + font Việt).
  const images = imgPath ? [mediaPublicUrl(imgPath)] : undefined;

  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: { canonical: `/m/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/m/${slug}`,
      ...(images ? { images } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
    // Tổng tim KHÔNG bao giờ xuất hiện trong metadata/OG (chỉ /me author thấy).
  };
}

export default async function PostDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // Next 16: params async
  const post = await getBySlug(createPublicClient(), slug);
  if (!post) notFound();

  const isMoment = post.type === "khoanh_khac";
  const media = post.media[0];
  const isVideo = media?.provider === "vimeo" && !!media.video_id;
  const imgPath = media?.path;

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <Link href="/" className="text-sm text-text-muted hover:text-text">
        ← Về Feed
      </Link>

      <article className="relative mt-4 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_4px_20px_rgba(62,74,83,0.06)]">
        <MoodBar mood={post.mood} />

        {isMoment &&
          (isVideo ? (
            <VideoEmbed
              videoId={media!.video_id!}
              poster={media!.poster_url}
              caption={post.caption ?? undefined}
            />
          ) : imgPath ? (
            <div className="relative aspect-4/3 w-full bg-background">
              <Image
                src={mediaPublicUrl(imgPath)}
                alt={post.caption ?? "Một khoảnh khắc"}
                fill
                sizes="(max-width: 600px) 100vw, 600px"
                className="object-cover"
                priority
              />
            </div>
          ) : null)}

        <div className="flex flex-col gap-3 p-6 pl-7">
          <MoodLabel mood={post.mood} />

          {isMoment ? (
            post.caption && (
              <p
                className="text-lg leading-relaxed text-text"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {post.caption}
              </p>
            )
          ) : (
            <>
              {post.excerpt && (
                <blockquote
                  className="border-l-2 border-border pl-4 text-lg italic leading-relaxed text-text"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {post.excerpt}
                </blockquote>
              )}
              {post.caption && <p className="text-text-muted">{post.caption}</p>}
              {post.linkUrl && (
                <a
                  href={post.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  nguồn ↗
                </a>
              )}
            </>
          )}

          <div className="pt-2">
            <HeartButton postId={post.id} />
          </div>
        </div>
      </article>
    </main>
  );
}
