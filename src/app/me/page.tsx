import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listByAuthor } from "@/lib/db/posts";
import { countsForAuthor } from "@/lib/db/hearts";
import { signOut } from "@/features/auth/actions";
import { MoodLabel } from "@/components/post/MoodBar";

// Author-only, dynamic (đọc session + tổng tim author-only, KHÔNG cache).
export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/me"); // double-check ngoài proxy guard

  const [posts, counts] = await Promise.all([
    listByAuthor(supabase, user.id),
    countsForAuthor(supabase),
  ]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-container px-4.5 py-12">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-medium text-text"
          style={{ fontFamily: "var(--font-serif)" }}
        >
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
          <p
            className="text-text-muted"
            style={{ fontFamily: "var(--font-serif)" }}
          >
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
        <ul className="mt-8 flex flex-col divide-y divide-border">
          {posts.map((post) => {
            const total = counts[post.id] ?? 0;
            const title =
              post.caption ||
              post.excerpt ||
              (post.type === "khoanh_khac" ? "Một khoảnh khắc" : "Một góc đọc");
            return (
              <li key={post.id} className="flex items-center gap-3 py-4">
                <Link
                  href={`/m/${post.slug}`}
                  className="flex-1 truncate text-text hover:text-accent"
                >
                  {title}
                </Link>
                <MoodLabel mood={post.mood} />
                {/* Tổng tim — CHỈ Tác giả thấy */}
                <span className="inline-flex items-center gap-1 text-sm text-text-muted">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    aria-hidden
                    fill="currentColor"
                    fillOpacity={0.5}
                  >
                    <path d="M12 20s-7-4.4-9.2-8.4C1.3 8.4 3 5.5 6 5.5c1.8 0 3 1 4 2.3 1-1.3 2.2-2.3 4-2.3 3 0 4.7 2.9 3.2 6.1C19 15.6 12 20 12 20Z" />
                  </svg>
                  {total}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
