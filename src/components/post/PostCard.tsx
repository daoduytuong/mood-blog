import Link from "next/link";
import type { Post } from "@/lib/db/posts";
import { mediaPublicUrl } from "@/lib/storage";
import { ImageBlur } from "@/components/ui/ImageBlur";
import { MoodBar, MoodLabel } from "./MoodBar";
import { HeartButton } from "@/features/hearts/HeartButton";

export function PostCard({ post }: { post: Post }) {
  const isMoment = post.type === "khoanh_khac";
  const media = post.media[0];
  const imgPath = media?.path;

  return (
    <article className="group relative overflow-hidden rounded-lg border border-border bg-surface shadow-[0_4px_20px_rgba(62,74,83,0.06)] transition-colors hover:border-accent focus-within:ring-2 focus-within:ring-accent">
      <MoodBar mood={post.mood} />

      {isMoment && imgPath && (
        <ImageBlur
          src={mediaPublicUrl(imgPath)}
          alt={post.caption ?? "Một khoảnh khắc"}
          sizes="(max-width: 600px) 100vw, 600px"
          blurDataURL={media?.blurDataURL}
        />
      )}

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
