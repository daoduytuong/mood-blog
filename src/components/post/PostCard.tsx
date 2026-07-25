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
import { MoodKicker } from "./MoodBar";
import { HeartButton } from "@/features/hearts/HeartButton";
import { POST_TYPE_LABEL } from "@/lib/post-type";

const FEED_IMG_SIZES = "(max-width: 600px) calc(100vw - 36px), 564px";

// "Ấn bản" editorial: thẻ KHÔNG có hộp/bóng — phân cách bằng hairline (divide-y ở FeedList).
// Kicker (mood + loại + ngày) trên cùng, ảnh full-bleed, caption serif lớn. Mood chỉ qua chấm+chữ.
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

  return (
    <article className="group relative py-9 first:pt-3">
      {/* Kicker: tâm trạng (màu) / loại · ngày — chất "măng-sét tạp chí". */}
      <div className="mb-4 flex items-center justify-between gap-3 text-[11px] text-text-muted">
        <div className="flex items-center gap-2.5">
          <MoodKicker mood={post.mood} />
          <span aria-hidden className="text-border">
            /
          </span>
          <span className="uppercase tracking-[0.18em]">
            {POST_TYPE_LABEL[post.type]}
          </span>
          {isJourney && imageItems.length > 0 && (
            <>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span className="tabular-nums uppercase tracking-[0.16em]">
                {imageItems.length} chặng
              </span>
            </>
          )}
        </div>
        <time dateTime={post.createdAt} className="shrink-0 uppercase tracking-[0.16em]">
          {formatPostDate(post.createdAt)}
        </time>
      </div>

      {isMoment &&
        (isVideo ? (
          // Video phát INLINE (chạm-mới-phát, muted + nút bật tiếng). z-10 nổi trên stretched-link.
          <div className="relative z-10">
            <VideoEmbed
              videoId={videoMedia!.video_id!}
              poster={videoMedia!.poster_url}
              caption={post.caption ?? undefined}
              startMutedOnTap
            />
          </div>
        ) : imageItems.length > 1 ? (
          // Nhiều ảnh: carousel vuốt + chấm. z-10 để vuốt được.
          <div className="relative z-10">
            <Gallery ariaLabel={post.caption ?? "Bộ ảnh"}>
              {imageItems.map((m, i) => (
                <ImageBlur
                  key={i}
                  src={mediaPublicUrl(m.path!)}
                  alt={`${post.caption ?? "Một khoảnh khắc"} (ảnh ${i + 1})`}
                  sizes={FEED_IMG_SIZES}
                  blurDataURL={m.blurDataURL}
                  priority={priority && i === 0}
                />
              ))}
            </Gallery>
          </div>
        ) : imageItems[0]?.path ? (
          // 1 ảnh: dưới stretched-link → chạm mở chi tiết.
          <ImageBlur
            src={mediaPublicUrl(imageItems[0].path)}
            alt={post.caption ?? "Một khoảnh khắc"}
            sizes={FEED_IMG_SIZES}
            blurDataURL={imageItems[0].blurDataURL}
            priority={priority}
          />
        ) : null)}

      {isJourney &&
        (journeySlides.length > 1 ? (
          // Lướt các chặng (mới nhất trước). z-10 để vuốt được (nổi trên stretched-link).
          <div className="relative z-10">
            <Gallery ariaLabel={post.caption ?? "Hành trình"}>
              {journeySlides.map(({ m, ordinal }, idx) => (
                // Slide bọc Link: CHẠM ảnh mở bài (Gallery nổi trên stretched-link
                // nên phải tự link); VUỐT vẫn lướt chặng (scroll không bắn click).
                <Link
                  key={m.path}
                  href={`/m/${post.slug}`}
                  aria-label={`Mở hành trình: ${linkText} (chặng ${ordinal})`}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <ImageBlur
                    src={mediaPublicUrl(m.path!)}
                    alt={`${post.caption ?? "Một hành trình"} (chặng ${ordinal})`}
                    sizes={FEED_IMG_SIZES}
                    blurDataURL={m.blurDataURL}
                    priority={priority && idx === 0}
                  />
                </Link>
              ))}
            </Gallery>
          </div>
        ) : journeySlides[0]?.m.path ? (
          // 1 chặng: dưới stretched-link → chạm mở chi tiết (như 1-ảnh).
          <ImageBlur
            src={mediaPublicUrl(journeySlides[0].m.path)}
            alt={`${post.caption ?? "Một hành trình"} (chặng 1)`}
            sizes={FEED_IMG_SIZES}
            blurDataURL={journeySlides[0].m.blurDataURL}
            priority={priority}
          />
        ) : null)}

      <div className="mt-5 flex flex-col gap-3">
        {isMoment || isJourney ? (
          post.caption && (
            <ExpandableText
              text={post.caption}
              clampClass="line-clamp-4"
              className="font-serif text-[1.5rem] leading-[1.3] text-text transition-colors group-hover:text-accent"
            />
          )
        ) : (
          <>
            {post.excerpt && (
              <div
                className="border-l-2 pl-4"
                style={{ borderColor: `var(${MOODS[post.mood].tokenVar})` }}
              >
                <ExpandableText
                  as="blockquote"
                  text={post.excerpt}
                  clampClass="line-clamp-5"
                  className="font-serif text-[1.4rem] italic leading-[1.4] text-text transition-colors group-hover:text-accent"
                />
              </div>
            )}
            {post.caption && <p className="text-sm text-text-muted">{post.caption}</p>}
            {post.linkUrl && (
              <span className="text-[11px] uppercase tracking-[0.16em] text-accent">
                nguồn ↗
              </span>
            )}
          </>
        )}

        {/* Cụm hành động (bình luận + tim) — GIỮ logic pointer-events + z-10 nổi trên stretched-link. */}
        <div className="pointer-events-none -mr-2 mt-1 flex items-center justify-end gap-0">
          {post.commentCount > 0 && (
            <Link
              href={`/m/${post.slug}#comments`}
              aria-label={`Mở ${post.commentCount} bình luận`}
              className="pointer-events-auto relative z-10 -mr-1 inline-flex min-h-11 items-center gap-1.5 rounded-full pl-2.5 pr-1 text-[13px] text-text-muted underline-offset-2 transition-colors hover:text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <CommentIcon size={19} strokeWidth={1.75} />
              <span className="tabular-nums leading-none">{post.commentCount}</span>
            </Link>
          )}
          <span className="pointer-events-auto relative z-10 inline-flex">
            <HeartButton postId={post.id} label={linkText} />
          </span>
        </div>
      </div>

      {/* Stretched link: bấm cả thẻ -> chi tiết. Dưới các control tương tác. */}
      <Link
        href={`/m/${post.slug}`}
        aria-label={`Mở ${isVideo ? "video" : "bài"}: ${linkText}`}
        className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      />
    </article>
  );
}
