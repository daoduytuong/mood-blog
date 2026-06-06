import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listByAuthor } from "@/lib/db/posts";
import { countsForAuthor } from "@/lib/db/hearts";
import {
  listRecentCommentsForPosts,
  countCommentsForPosts,
} from "@/lib/db/comments";
import { mediaPublicUrl } from "@/lib/storage";
import { formatPostDate } from "@/lib/date";
import { signOut } from "@/features/auth/actions";
import { MoodBar, MoodLabel } from "@/components/post/MoodBar";
import { HeartIcon } from "@/components/ui/HeartIcon";
import {
  CommentInbox,
  type InboxPost,
} from "@/features/comments/CommentInbox";

// Author-only, dynamic (đọc session + số liệu author-only, KHÔNG cache).
export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/me"); // double-check ngoài proxy guard

  const posts = await listByAuthor(supabase, user.id);
  const postIds = posts.map((p) => p.id);
  const [counts, recent, totalComments] = await Promise.all([
    countsForAuthor(supabase),
    listRecentCommentsForPosts(supabase, postIds),
    countCommentsForPosts(supabase, postIds),
  ]);

  const totalHearts = Object.values(counts).reduce((a, b) => a + b, 0);

  // Hộp thư: chỉ lời người xem (bỏ trả lời của chính tác giả) + map tiêu đề bài.
  const inboxComments = recent.filter((c) => c.userId === null);
  const postMap: Record<string, InboxPost> = Object.fromEntries(
    posts.map((p) => [
      p.id,
      {
        slug: p.slug,
        title:
          p.caption ||
          p.excerpt ||
          (p.type === "khoanh_khac" ? "Một khoảnh khắc" : "Một góc đọc"),
      },
    ]),
  );

  const stats = [
    { value: posts.length, label: "bài" },
    { value: totalHearts, label: "tim" },
    { value: totalComments, label: "lời" },
  ];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-container px-4.5 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-medium text-text">
          Trang của bạn
        </h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-text-muted hover:text-text"
          >
            Đăng xuất
          </button>
        </form>
      </div>

      {posts.length === 0 ? (
        <div className="mt-12 flex flex-col items-start gap-4">
          <p className="font-serif text-text-muted">
            Chưa có bài nào. Khi nào rảnh, ghi lại một khoảnh khắc nhé.
          </p>
          <Link
            href="/compose"
            className="rounded-md bg-accent px-4 py-2 text-sm text-on-accent"
          >
            Soạn bài
          </Link>
        </div>
      ) : (
        <>
          {/* Dải tổng quan TĨNH — riêng tư, không so sánh, không animation. */}
          <div className="mt-6 flex gap-10 border-y border-border py-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="font-serif text-2xl text-text">{s.value}</span>
                <span className="text-xs text-text-muted">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Lưới bài có thumbnail */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            {posts.map((post) => {
              const total = counts[post.id] ?? 0;
              const title =
                post.caption ||
                post.excerpt ||
                (post.type === "khoanh_khac"
                  ? "Một khoảnh khắc"
                  : "Một góc đọc");
              const media = post.media[0];
              const imgPath = media?.path;
              const poster = media?.poster_url;
              return (
                <Link
                  key={post.id}
                  href={`/m/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-accent"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-border/40">
                    <MoodBar mood={post.mood} />
                    {imgPath ? (
                      <Image
                        src={mediaPublicUrl(imgPath)}
                        alt=""
                        fill
                        sizes="(max-width: 600px) 45vw, 280px"
                        className="object-cover"
                      />
                    ) : poster ? (
                      // eslint-disable-next-line @next/next/no-img-element -- poster Vimeo ngoài
                      <img
                        src={poster}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 pl-6">
                        <p className="line-clamp-4 font-serif text-sm italic text-text-muted">
                          {post.excerpt || "Góc đọc"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 p-3">
                    <p className="line-clamp-1 text-sm text-text">{title}</p>
                    <div className="flex items-center justify-between gap-2">
                      <MoodLabel mood={post.mood} />
                      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                        <HeartIcon size={14} fillOpacity={0.5} strokeWidth={1.5} />
                        {total}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted">
                      {formatPostDate(post.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Hộp thư — lời người xem gửi tới (chấm báo "mới" + ẩn/xoá). */}
      <section className="mt-14">
        <h2 className="mb-4 font-serif text-lg font-medium text-text">
          Hộp thư
        </h2>
        <CommentInbox initial={inboxComments} posts={postMap} />
      </section>
    </main>
  );
}
