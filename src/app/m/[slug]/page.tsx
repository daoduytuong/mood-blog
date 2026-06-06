import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getBySlug } from "@/lib/db/posts";
import { mediaPublicUrl } from "@/lib/storage";
import { MoodBar, MoodLabel } from "@/components/post/MoodBar";
import { HeartButton } from "@/features/hearts/HeartButton";

// Chi tiết bài (tối giản — Story 2.4 hoàn thiện: Vimeo poster, OG/metadata, fallback, chuyển trang mềm).
export const revalidate = 300;

export default async function PostDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // Next 16: params async
  const post = await getBySlug(createPublicClient(), slug);
  if (!post) notFound();

  const isMoment = post.type === "khoanh_khac";
  const imgPath = post.media[0]?.path;

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <Link href="/" className="text-sm text-text-muted hover:text-text">
        ← Về Feed
      </Link>

      <article className="relative mt-4 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_4px_20px_rgba(62,74,83,0.06)]">
        <MoodBar mood={post.mood} />

        {isMoment && imgPath && (
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
        )}

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
