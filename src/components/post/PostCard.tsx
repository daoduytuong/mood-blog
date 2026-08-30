import Link from "next/link";
import type { Post } from "@/lib/db/posts";
import { MOODS } from "@/lib/moods";
import { mediaPublicUrl } from "@/lib/storage";
import { formatPostDate } from "@/lib/date";
import { ImageBlur } from "@/components/ui/ImageBlur";
import { Gallery } from "@/components/ui/Gallery";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { VideoEmbed } from "@/components/ui/VideoEmbed";
import { CommentIcon } from "@/components/ui/CommentIcon";
import { Card } from "@/components/ui/Card";
import { MoodAvatar } from "./MoodAvatar";
import { HeartButton } from "@/features/hearts/HeartButton";
import { LikeCount } from "@/features/hearts/LikeCount";
import { DoubleTapMedia } from "@/features/hearts/DoubleTapMedia";
import { POST_TYPE_LABEL } from "@/lib/post-type";

const FEED_IMG_SIZES = "(max-width: 600px) 100vw, 600px";

// "Nguyên bản" — card kiểu Instagram sơ khai: header (mood-avatar + nhãn mood + ngày),
// ảnh vuông full-bleed, action row TRÁI dưới ảnh, số tim, caption sans nhỏ.
// GIỮ contract stretched-link: control tương tác phải pointer-events-auto + z-10.
export function PostCard({
  post,
  priority = false,
}: {
  post: Post;
  priority?: boolean;
}) {
  const isMoment = post.type === "khoanh_khac";
  const isJourney = post.type === "hanh_trinh";
  const videoMedia = post.media.find((m) => m.provider === "vimeo" && !!m.video_id);
  const imageItems = post.media.filter((m) => !!m.path);
  const isVideo = !!videoMedia;
  // Hành trình: lướt được các chặng, MỚI NHẤT trước (media append theo thời gian -> đảo).
  const journeySlides = isJourney
    ? imageItems.map((m, i) => ({ m, ordinal: i + 1 })).reverse()
    : [];
  const linkText =
    post.caption ??
    post.excerpt ??
    (isMoment ? "khoảnh khắc" : isJourney ? "hành trình" : "bài viết");
  // Tỉ lệ THẬT của ảnh (không crop, height linh hoạt). Bài cũ thiếu w/h -> undefined
  // (ImageBlur fallback khung 4/3 chống giật layout).
  const ratioOf = (m: (typeof imageItems)[number]) =>
    m.w && m.h ? m.w / m.h : undefined;
  // Carousel nhiều ảnh: KHUNG CHUNG = tỉ lệ ảnh CAO nhất (min w/h) cho mọi slide
  // -> track không sinh khoảng trống; ảnh thấp hơn object-contain (trọn ảnh, không crop).
  const ratios = imageItems.map(ratioOf);
  const sharedRatio = ratios.every((r) => r !== undefined)
    ? Math.min(...(ratios as number[]))
    : undefined;
  const href = `/m/${post.slug}`;
  const moodLabel = MOODS[post.mood].label;
  const typeLine = isJourney
    ? `${POST_TYPE_LABEL[post.type]}${imageItems.length > 0 ? ` · ${imageItems.length} chặng` : ""}`
    : POST_TYPE_LABEL[post.type];

  return (
    <Card>
      <article className="group relative">
        {/* Header kiểu IG: mood làm "avatar", nhãn mood làm "username". */}
        <div className="flex items-center gap-3 p-3">
          <MoodAvatar mood={post.mood} />
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-semibold lowercase leading-tight text-text">
              {moodLabel}
            </span>
            <span className="text-[11px] leading-tight text-text-muted">
              {typeLine}
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
            // Video phát INLINE (chạm-mới-phát, muted). KHÔNG bọc double-tap (chạm = phát).
            <div className="relative z-10">
              <VideoEmbed
                videoId={videoMedia!.video_id!}
                poster={videoMedia!.poster_url}
                caption={post.caption ?? undefined}
                startMutedOnTap
              />
            </div>
          ) : imageItems.length > 1 ? (
            // Nhiều ảnh: carousel vuốt; mỗi slide double-tap = thả tim, chạm 1 = mở bài.
            <div className="relative z-10">
              <Gallery ariaLabel={post.caption ?? "Bộ ảnh"}>
                {imageItems.map((m, i) => (
                  <DoubleTapMedia
                    key={i}
                    postId={post.id}
                    href={href}
                    label={`Mở bài: ${linkText} (ảnh ${i + 1})`}
                  >
                    <ImageBlur
                      src={mediaPublicUrl(m.path!)}
                      alt={`${post.caption ?? "Một khoảnh khắc"} (ảnh ${i + 1})`}
                      sizes={FEED_IMG_SIZES}
                      blurDataURL={m.blurDataURL}
                      ratio={sharedRatio}
                      fit="contain"
                      priority={priority && i === 0}
                    />
                  </DoubleTapMedia>
                ))}
              </Gallery>
            </div>
          ) : imageItems[0]?.path ? (
            <DoubleTapMedia
              postId={post.id}
              href={href}
              label={`Mở bài: ${linkText}`}
            >
              <ImageBlur
                src={mediaPublicUrl(imageItems[0].path)}
                alt={post.caption ?? "Một khoảnh khắc"}
                sizes={FEED_IMG_SIZES}
                blurDataURL={imageItems[0].blurDataURL}
                ratio={ratioOf(imageItems[0])}
                priority={priority}
              />
            </DoubleTapMedia>
          ) : null)}

        {isJourney &&
          (journeySlides.length > 1 ? (
            <div className="relative z-10">
              <Gallery ariaLabel={post.caption ?? "Hành trình"}>
                {journeySlides.map(({ m, ordinal }, idx) => (
                  <DoubleTapMedia
                    key={m.path}
                    postId={post.id}
                    href={href}
                    label={`Mở hành trình: ${linkText} (chặng ${ordinal})`}
                  >
                    <ImageBlur
                      src={mediaPublicUrl(m.path!)}
                      alt={`${post.caption ?? "Một hành trình"} (chặng ${ordinal})`}
                      sizes={FEED_IMG_SIZES}
                      blurDataURL={m.blurDataURL}
                      ratio={sharedRatio}
                      fit="contain"
                      priority={priority && idx === 0}
                    />
                  </DoubleTapMedia>
                ))}
              </Gallery>
            </div>
          ) : journeySlides[0]?.m.path ? (
            <DoubleTapMedia
              postId={post.id}
              href={href}
              label={`Mở hành trình: ${linkText} (chặng 1)`}
            >
              <ImageBlur
                src={mediaPublicUrl(journeySlides[0].m.path)}
                alt={`${post.caption ?? "Một hành trình"} (chặng 1)`}
                sizes={FEED_IMG_SIZES}
                blurDataURL={journeySlides[0].m.blurDataURL}
                ratio={ratioOf(journeySlides[0].m)}
                priority={priority}
              />
            </DoubleTapMedia>
          ) : null)}

        {/* Góc đọc: card chữ — quote viền mood nằm trong phần đệm. */}
        {!isMoment && !isJourney && (post.excerpt || post.caption) && (
          <div className="flex flex-col gap-2 px-3 pt-1">
            {post.excerpt && (
              <div
                className="border-l-2 pl-3"
                style={{ borderColor: `var(${MOODS[post.mood].tokenVar})` }}
              >
                <ExpandableText
                  as="blockquote"
                  text={post.excerpt}
                  clampClass="line-clamp-5"
                  className="text-[15px] italic leading-relaxed text-text"
                />
              </div>
            )}
            {post.linkUrl && (
              <span className="text-[11px] uppercase tracking-[0.16em] text-accent">
                nguồn ↗
              </span>
            )}
          </div>
        )}

        {/* Action row TRÁI kiểu IG + số tim + link bình luận + caption. */}
        <div className="flex flex-col gap-1 p-3">
          <div className="pointer-events-none -ml-2.5 flex items-center">
            <span className="pointer-events-auto relative z-10 inline-flex">
              <HeartButton postId={post.id} label={linkText} />
            </span>
            <Link
              href={`/m/${post.slug}#comments`}
              aria-label={
                post.commentCount > 0
                  ? `Mở ${post.commentCount} bình luận`
                  : "Viết bình luận"
              }
              className="pointer-events-auto relative z-10 grid min-h-11 min-w-11 place-items-center rounded-full text-text transition-colors hover:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <CommentIcon size={20} strokeWidth={1.75} />
            </Link>
          </div>

          <LikeCount postId={post.id} serverCount={post.heartCount} />

          {(isMoment || isJourney) && post.caption && (
            <ExpandableText
              text={post.caption}
              clampClass="line-clamp-3"
              className="text-[14px] leading-snug text-text"
            />
          )}
          {!isMoment && !isJourney && post.caption && (
            <p className="text-[13px] text-text-muted">{post.caption}</p>
          )}

          {post.commentCount > 0 && (
            <Link
              href={`/m/${post.slug}#comments`}
              className="pointer-events-auto relative z-10 self-start text-[13px] text-text-muted transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Xem {post.commentCount} bình luận
            </Link>
          )}
        </div>

        {/* Stretched link: bấm cả thẻ -> chi tiết. Dưới các control tương tác. */}
        <Link
          href={href}
          aria-label={`Mở ${isVideo ? "video" : "bài"}: ${linkText}`}
          className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        />
      </article>
    </Card>
  );
}
