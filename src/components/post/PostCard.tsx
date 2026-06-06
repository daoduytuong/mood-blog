import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/db/posts";
import { mediaPublicUrl } from "@/lib/storage";
import { MoodBar, MoodLabel } from "./MoodBar";

export function PostCard({ post }: { post: Post }) {
  const isMoment = post.type === "khoanh_khac";
  const imgPath = post.media[0]?.path;

  return (
    <Link
      href={`/m/${post.slug}`}
      className="group relative block overflow-hidden rounded-lg border border-border bg-surface shadow-[0_4px_20px_rgba(62,74,83,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(62,74,83,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <MoodBar mood={post.mood} />

      {isMoment && imgPath && (
        <div className="relative aspect-[4/3] w-full bg-background">
          <Image
            src={mediaPublicUrl(imgPath)}
            alt={post.caption ?? "Một khoảnh khắc"}
            fill
            sizes="(max-width: 600px) 100vw, 600px"
            className="object-cover"
          />
        </div>
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
      </div>
    </Link>
  );
}
