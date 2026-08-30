import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getBySlug, listSlugs } from "@/lib/db/posts";
import { listComments } from "@/lib/db/comments";
import { mediaPublicUrl } from "@/lib/storage";
import { siteUrl } from "@/lib/site";
import { Lightbox } from "@/components/ui/Lightbox";
import { MoodAvatar } from "@/components/post/MoodAvatar";
import { formatPostDate } from "@/lib/date";
import { MOODS } from "@/lib/moods";
import { PostAuthorActions } from "@/components/post/PostAuthorActions";
import { POST_TYPE_LABEL, POST_TYPE_FALLBACK_TITLE } from "@/lib/post-type";
import { ShareButton } from "@/components/post/ShareButton";
import { HeartButton } from "@/features/hearts/HeartButton";
import { LikeCount } from "@/features/hearts/LikeCount";
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
    post.caption || post.excerpt || POST_TYPE_FALLBACK_TITLE[post.type];
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
  const isJourney = post.type === "hanh_trinh";
  const videoMedia = post.media.find((m) => m.provider === "vimeo" && !!m.video_id);
  const imageItems = post.media.filter((m) => !!m.path);
  const isVideo = !!videoMedia;
  // ratio THẬT từng ảnh (KHÔNG kẹp — hiển thị đúng khung gốc, height linh hoạt);
  // thiếu w/h (bài cũ) -> undefined (ImageBlur fallback 4/3).
  const ratioOf = (m: (typeof imageItems)[number]) =>
    m.w && m.h ? m.w / m.h : undefined;
  // Carousel nhiều ảnh: khung chung = ảnh cao nhất + contain/nền blur (het khoảng trống).
  const detailRatios = imageItems.map(ratioOf);
  const sharedRatio = detailRatios.every((r) => r !== undefined)
    ? Math.min(...(detailRatios as number[]))
    : undefined;
  // Hành trình: chặng đánh số theo thứ tự lưu (cũ->mới), hiển thị mới nhất trước.
  const journeyEntries = imageItems
    .map((m, i) => ({ m, ordinal: i + 1 }))
    .reverse();

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <Link href="/" className="text-sm text-text-muted hover:text-text">
        ← Về Feed
      </Link>

      <article className="relative mt-6">
        {/* Header "Nguyên bản" (đồng bộ PostCard): mood-avatar + nhãn mood + loại · ngày */}
        <div className="mb-5 flex items-center gap-3">
          <MoodAvatar mood={post.mood} />
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-semibold lowercase leading-tight text-text">
              {MOODS[post.mood].label}
            </span>
            <span className="text-[11px] leading-tight text-text-muted">
              {POST_TYPE_LABEL[post.type]}
            </span>
          </div>
          <time
            dateTime={post.createdAt}
            className="ml-auto shrink-0 text-[11px] text-text-muted"
          >
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
                  ratio={sharedRatio}
                  fit="contain"
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

        {isJourney && (
          <div className="flex flex-col gap-2">
            {post.caption && (
              <h1 className="font-serif text-[1.7rem] leading-[1.35] text-text">
                {post.caption}
              </h1>
            )}
            <p className="text-sm text-text-muted">
              {journeyEntries.length === 0
                ? "Chưa có chặng nào."
                : `${journeyEntries.length} chặng${
                    imageItems[0]?.date
                      ? ` · bắt đầu ${formatPostDate(imageItems[0].date)}`
                      : ""
                  }`}
            </p>

            <div className="mt-4 flex flex-col gap-8">
              {journeyEntries.map(({ m, ordinal }, idx) => (
                <section key={m.path} className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em] text-text-muted">
                    <span>Chặng {ordinal}</span>
                    {m.date && <span>{formatPostDate(m.date)}</span>}
                  </div>
                  <Lightbox
                    src={mediaPublicUrl(m.path!)}
                    alt={`${post.caption ?? "Hành trình"} — chặng ${ordinal}`}
                    sizes="(max-width: 600px) 100vw, 600px"
                    blurDataURL={m.blurDataURL}
                    ratio={ratioOf(m)}
                    priority={idx === 0}
                  />
                  {m.note && (
                    <p className="font-serif leading-relaxed text-text-muted">
                      {m.note}
                    </p>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {isJourney ? null : isMoment ? (
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

          <div className="flex flex-col gap-1 pt-2">
            <div className="-ml-2.5 flex items-center gap-1">
              <HeartButton postId={post.id} />
              <ShareButton
                slug={post.slug}
                title={post.caption ?? post.excerpt ?? undefined}
              />
            </div>
            <LikeCount postId={post.id} serverCount={post.heartCount} />
          </div>

          <PostAuthorActions postId={post.id} slug={post.slug} type={post.type} />
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
