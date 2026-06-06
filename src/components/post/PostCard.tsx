import Link from "next/link";
import type { Post } from "@/lib/db/posts";
import { mediaPublicUrl } from "@/lib/storage";
import { ImageBlur } from "@/components/ui/ImageBlur";
import { MoodBar, MoodLabel } from "./MoodBar";
import { HeartButton } from "@/features/hearts/HeartButton";

export function PostCard({
  post,
  priority = false,
}: {
  post: Post;
  priority?: boolean;
}) {
  const isMoment = post.type === "khoanh_khac";
  const media = post.media[0];
  const isVideo = media?.provider === "vimeo" && !!media.video_id;
  const imgPath = media?.path;
  // Nhãn dùng chung cho aria-label của link & tim (Góc đọc lấy excerpt).
  const linkText =
    post.caption ?? post.excerpt ?? (isMoment ? "khoảnh khắc" : "bài viết");

  return (
    <article className="group relative overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-colors hover:border-accent focus-within:ring-2 focus-within:ring-inset focus-within:ring-accent">
      <MoodBar mood={post.mood} />

      {isMoment &&
        (isVideo ? (
          // Feed: poster tĩnh + icon play (cùng khung 4/3 với thẻ ảnh). Bấm thẻ mở detail.
          <div className="relative aspect-4/3 w-full overflow-hidden bg-border/40">
            {media?.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- poster Vimeo ngoài; không cần next/image
              <img
                src={media.poster_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="sr-only">
                Video: {post.caption ?? "một khoảnh khắc"}
              </span>
            )}
            <span
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/85 text-text shadow-soft">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
            </span>
          </div>
        ) : imgPath ? (
          <ImageBlur
            src={mediaPublicUrl(imgPath)}
            alt={post.caption ?? "Một khoảnh khắc"}
            sizes="(max-width: 600px) calc(100vw - 36px), 564px"
            blurDataURL={media?.blurDataURL}
            priority={priority}
          />
        ) : null)}

      <div className="flex flex-col gap-2 p-5 pl-6 pr-10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.06em] text-text-muted">
            {isMoment ? "Khoảnh khắc" : "Góc đọc"}
          </span>
          <MoodLabel mood={post.mood} />
        </div>

        {isMoment ? (
          post.caption && (
            <p className="line-clamp-3 font-serif text-[18px] leading-[1.65] text-text">
              {post.caption}
            </p>
          )
        ) : (
          <>
            {post.excerpt && (
              <blockquote className="line-clamp-4 border-l-2 border-border pl-3 font-serif italic text-text">
                {post.excerpt}
              </blockquote>
            )}
            {post.caption && (
              <p className="line-clamp-2 text-sm text-text-muted">
                {post.caption}
              </p>
            )}
            {post.linkUrl && <span className="text-xs text-accent">nguồn ↗</span>}
          </>
        )}
      </div>

      {/* Stretched link: bấm cả thẻ -> chi tiết. Đặt DƯỚI các control tương tác. */}
      <Link
        href={`/m/${post.slug}`}
        aria-label={`Mở ${isVideo ? "video" : "bài"}: ${linkText}`}
        className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      />

      {/* Tim lặng nổi trên stretched-link (z-10) -> không kích hoạt điều hướng. */}
      <div className="absolute bottom-3 right-3 z-10">
        <HeartButton postId={post.id} label={linkText} />
      </div>
    </article>
  );
}
