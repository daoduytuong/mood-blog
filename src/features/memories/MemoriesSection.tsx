import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/lib/db/posts";
import { mediaPublicUrl } from "@/lib/storage";
import { postThumb, postTitle } from "@/lib/post-type";
import { MoodLabel } from "@/components/post/MoodBar";
import { selectMemories } from "./select";

/**
 * "Ngày này năm xưa" trên /me — riêng tư, để tự nhìn lại.
 *
 * Không có kỷ niệm thì KHÔNG render gì (không "chưa có gì ở đây" — nhắc người ta
 * về một khoảng trống là việc không cần thiết). Không streak, không "bạn đã bỏ
 * lỡ N ngày": ở đây không có ai bị chấm công.
 */
export function MemoriesSection({ posts }: { posts: Post[] }) {
  const memories = selectMemories(posts);
  if (memories.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 font-serif text-lg font-medium text-text">
        Ngày này năm xưa
      </h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {memories.map(({ post, yearsAgo }) => {
          const media = postThumb(post);
          const src = media?.path
            ? mediaPublicUrl(media.path)
            : (media?.poster_url ?? null);
          return (
            <li key={post.id}>
              <Link
                href={`/m/${post.slug}`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-background"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-border/40">
                  {src &&
                    (media?.path ? (
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- poster Vimeo ngoài
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    ))}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs text-text-muted">
                    {yearsAgo} năm trước
                  </span>
                  <p className="line-clamp-1 text-sm text-text">
                    {postTitle(post)}
                  </p>
                  <MoodLabel mood={post.mood} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
