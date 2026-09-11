import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/lib/db/posts";
import { mediaPublicUrl } from "@/lib/storage";
import { postThumb, postTitle, POST_TYPE_LABEL } from "@/lib/post-type";
import { formatPostDate } from "@/lib/date";
import { MoodLabel } from "@/components/post/MoodBar";
import { deletePostAction } from "@/features/compose/actions";
import { Button } from "@/components/ui/Button";

/**
 * Nháp trên /me — chưa đăng, chỉ tác giả thấy (RLS chặn anon).
 *
 * Không có nháp thì KHÔNG render gì: nhắc "bạn chẳng có nháp nào" là việc
 * không cần thiết (cùng tinh thần MemoriesSection).
 */
export function DraftList({ drafts }: { drafts: Post[] }) {
  if (drafts.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-serif text-lg font-medium text-text">
        Nháp <span className="text-sm text-text-muted">({drafts.length})</span>
      </h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {drafts.map((post) => {
          const media = postThumb(post);
          const src = media?.path ? mediaPublicUrl(media.path) : null;
          return (
            <li key={post.id} className="flex items-center gap-2 pr-3">
              <Link
                href={`/me/nhap/${post.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 p-3 transition-colors hover:bg-background"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-border/40">
                  {src && (
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="line-clamp-1 text-sm text-text">
                    {postTitle(post)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{POST_TYPE_LABEL[post.type]}</span>
                    <span>·</span>
                    <span>{formatPostDate(post.createdAt)}</span>
                  </div>
                  <MoodLabel mood={post.mood} />
                </div>
              </Link>
              <form action={deletePostAction}>
                <input type="hidden" name="id" value={post.id} />
                <Button type="submit" variant="danger" size="sm">
                  Xoá
                </Button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
