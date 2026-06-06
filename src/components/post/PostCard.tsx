import Link from "next/link";
import type { Post } from "@/lib/db/posts";
import { mediaPublicUrl } from "@/lib/storage";
import { ImageBlur } from "@/components/ui/ImageBlur";
import { MoodBar, MoodLabel } from "./MoodBar";
import { HeartButton } from "@/features/hearts/HeartButton";

export function PostCard({ post }: { post: Post }) {
  const isMoment = post.type === "khoanh_khac";
  const media = post.media[0];
  const isVideo = media?.provider === "vimeo" && !!media.video_id;
  const imgPath = media?.path;

  return (
    <article className="group relative overflow-hidden rounded-lg border border-border bg-surface shadow-[0_4px_20px_rgba(62,74,83,0.06)] transition-colors hover:border-accent focus-within:ring-2 focus-within:ring-accent">
      <MoodBar mood={post.mood} />

      {isMoment &&
        (isVideo ? (
          // Feed: poster tĩnh + icon play. Bài video KHÔNG phát tại feed -> bấm thẻ mở detail.
          <div className="relative aspect-video w-full overflow-hidden bg-border/40">
            {media?.poster_url && (
              // eslint-disable-next-line @next/next/no-img-element -- poster Vimeo ngoài; không cần next/image
              <img
                src={media.poster_url}
                alt={post.caption ?? "Một khoảnh khắc"}
                className="h-full w-full object-cover"
              />
            )}
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/85 text-text shadow-[0_4px_20px_rgba(62,74,83,0.12)]">
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
            sizes="(max-width: 600px) 100vw, 600px"
            blurDataURL={media?.blurDataURL}
          />
        ) : null)}

      <div className="flex flex-col gap-2 p-5 pl-6">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-text-muted">
            {isMoment ? "Khoảnh khắc" : "Góc đọc"}
          </span>
          <MoodLabel mood={post.mood} />
        </div>

        {isMoment
          ? post.caption && (
              <p className="text-text" style={{ fontFamily: "var(--font-serif)" }}>
                {post.caption}
              </p>
            )
          : (
              <>
                {post.excerpt && (
                  <blockquote
                    className="border-l-2 border-border pl-3 italic text-text"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {post.excerpt}
                  </blockquote>
                )}
                {post.caption && (
                  <p className="text-sm text-text-muted">{post.caption}</p>
                )}
                {post.linkUrl && (
                  <span className="text-xs text-accent">nguồn ↗</span>
                )}
              </>
            )}

        {/* chừa chỗ cho nút tim ở góc dưới-phải */}
        <div className="h-2" />
      </div>

      {/* Stretched link: bấm cả thẻ -> chi tiết. Đặt DƯỚI các control tương tác. */}
      <Link
        href={`/m/${post.slug}`}
        aria-label={`Mở: ${post.caption ?? "bài đăng"}`}
        className="absolute inset-0 focus:outline-none"
      />

      {/* Tim lặng nổi trên stretched-link (z-10) -> không kích hoạt điều hướng. */}
      <div className="absolute bottom-3 right-3 z-10">
        <HeartButton postId={post.id} />
      </div>
    </article>
  );
}
