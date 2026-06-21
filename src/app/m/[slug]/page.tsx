import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getBySlug, listSlugs } from "@/lib/db/posts";
import { listComments } from "@/lib/db/comments";
import { mediaPublicUrl } from "@/lib/storage";
import { siteUrl } from "@/lib/site";
import { Lightbox } from "@/components/ui/Lightbox";
import { MoodKicker } from "@/components/post/MoodBar";
import { formatPostDate } from "@/lib/date";
import { MOODS } from "@/lib/moods";
import { PostAuthorActions } from "@/components/post/PostAuthorActions";
import { ShareButton } from "@/components/post/ShareButton";
import { HeartButton } from "@/features/hearts/HeartButton";
import { Gallery } from "@/components/ui/Gallery";
import { VideoEmbed } from "@/components/ui/VideoEmbed";
import { CommentSection } from "@/features/comments/CommentSection";

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

  // Bình luận: nạp sẵn lúc render (SSR/ISR) — island sẽ refetch để tươi.
  const initialComments = await listComments(createPublicClient(), post.id);

  const isMoment = post.type === "khoanh_khac";
  const videoMedia = post.media.find((m) => m.provider === "vimeo" && !!m.video_id);
  const imageItems = post.media.filter((m) => !!m.path);
  const isVideo = !!videoMedia;
  // ratio THẬT từng ảnh (kẹp trần 4:5); thiếu w/h -> undefined (ImageBlur fallback 4/3).
  const ratioOf = (m: (typeof imageItems)[number]) =>
    m.w && m.h ? Math.max(m.w / m.h, 0.8) : undefined;

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <Link href="/" className="text-sm text-text-muted hover:text-text">
        ← Về Feed
      </Link>

      <article className="relative mt-6">
        {/* Kicker editorial: tâm trạng (màu) / loại · ngày */}
        <div className="mb-5 flex items-center justify-between gap-3 text-[11px] text-text-muted">
          <div className="flex items-center gap-2.5">
            <MoodKicker mood={post.mood} />
            <span aria-hidden className="text-border">
              /
            </span>
            <span className="uppercase tracking-[0.18em]">
              {isMoment ? "Khoảnh khắc" : "Góc đọc"}
            </span>
          </div>
          <time dateTime={post.createdAt} className="shrink-0 uppercase tracking-[0.16em]">
            {formatPostDate(post.createdAt)}
          </time>
        </div>

        {isMoment &&
          (isVideo ? (
            <VideoEmbed
              videoId={videoMedia!.video_id!}
              poster={videoMedia!.poster_url}
              caption={post.caption ?? undefined}
              autoPlay
            />
          ) : imageItems.length > 1 ? (
            <Gallery ariaLabel={post.caption ?? "Bộ ảnh"}>
              {imageItems.map((m, i) => (
                <Lightbox
                  key={i}
                  src={mediaPublicUrl(m.path!)}
                  alt={`${post.caption ?? "Một khoảnh khắc"} (ảnh ${i + 1})`}
                  sizes="(max-width: 600px) 100vw, 600px"
                  blurDataURL={m.blurDataURL}
                  ratio={ratioOf(m)}
                  priority={i === 0}
                />
              ))}
            </Gallery>
          ) : imageItems[0]?.path ? (
            <Lightbox
              src={mediaPublicUrl(imageItems[0].path)}
              alt={post.caption ?? "Một khoảnh khắc"}
              sizes="(max-width: 600px) 100vw, 600px"
              blurDataURL={imageItems[0].blurDataURL}
              ratio={ratioOf(imageItems[0])}
              priority
            />
          ) : null)}

        <div className="mt-6 flex flex-col gap-4">
          {isMoment ? (
            post.caption && (
              <p className="font-serif text-[1.7rem] leading-[1.35] text-text">
                {post.caption}
              </p>
            )
          ) : (
            <>
              {post.excerpt && (
                <blockquote
                  className="border-l-2 pl-5 font-serif text-[1.6rem] italic leading-[1.4] text-text"
                  style={{ borderColor: `var(${MOODS[post.mood].tokenVar})` }}
                >
                  {post.excerpt}
                </blockquote>
              )}
              {post.caption && (
                <p className="leading-relaxed text-text-muted">{post.caption}</p>
              )}
              {post.linkUrl && (
                <a
                  href={post.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] uppercase tracking-[0.16em] text-accent hover:underline"
                >
                  nguồn ↗
                </a>
              )}
            </>
          )}

          <div className="flex items-center gap-1 pt-2">
            <HeartButton postId={post.id} />
            <ShareButton
              slug={post.slug}
              title={post.caption ?? post.excerpt ?? undefined}
            />
          </div>

          <PostAuthorActions postId={post.id} slug={post.slug} />
        </div>
      </article>

      <CommentSection
        postId={post.id}
        authorId={post.authorId}
        initialComments={initialComments}
      />
    </main>
  );
}
