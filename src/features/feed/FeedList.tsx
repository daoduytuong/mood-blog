"use client";

import { useState } from "react";
import { PostCard } from "@/components/post/PostCard";
import { loadMorePosts } from "./actions";
import type { Post } from "@/lib/db/posts";

// Feed CÓ ĐÁY: "Xem thêm" thủ công (keyset) + điểm dừng ấm. KHÔNG vô-tận-cuộn tự nạp.
export function FeedList({
  initial,
  pageSize,
}: {
  initial: Post[];
  pageSize: number;
}) {
  const [posts, setPosts] = useState<Post[]>(initial);
  const [done, setDone] = useState(initial.length < pageSize);
  const [pending, setPending] = useState(false);

  async function more() {
    const last = posts[posts.length - 1];
    if (!last || pending) return;
    setPending(true);
    try {
      const next = await loadMorePosts(
        { createdAt: last.createdAt, id: last.id },
        pageSize,
      );
      setPosts((p) => [...p, ...next]);
      if (next.length < pageSize) setDone(true);
    } catch {
      /* im lặng */
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post, i) => (
        <PostCard key={post.id} post={post} priority={i === 0} />
      ))}

      {done ? (
        <p className="self-center py-8 text-center font-serif text-sm text-text-muted">
          Hết rồi. Cảm ơn đã ghé.
        </p>
      ) : (
        <button
          type="button"
          onClick={more}
          disabled={pending}
          className="mt-1 self-center rounded-full border border-border px-5 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        >
          {pending ? "Đang mở…" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}
