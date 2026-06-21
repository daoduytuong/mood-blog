"use client";

import { useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/post/PostCard";
import { loadMorePosts, getFreshFeed } from "./actions";
import type { Post } from "@/lib/db/posts";

const STORE_KEY = "feed:cache:v1";

type FeedCache = { posts: Post[]; done: boolean; scrollY: number; ts: number };

// Feed CÓ ĐÁY: "Xem thêm" thủ công (keyset) + điểm dừng ấm. KHÔNG vô-tận-cuộn.
// Cache localStorage (stale-while-revalidate): quay về feed thấy NGAY bản cũ + giữ vị trí cuộn,
// đồng thời gọi lại API nền. CHỈ thay bằng bản tươi khi đang ở ĐẦU feed (chưa cuộn, chưa mở thêm)
// -> không "chen" bài mới khi đang đọc giữa chừng (tôn trọng "feed không tự nhảy").
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
  const postsRef = useRef<Post[]>(initial);
  const persistReady = useRef(false);

  // Giữ ref đồng bộ (đọc trong callback revalidate async) — cập nhật trong effect, không trong render.
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // Mount: (1) hiện cache cũ tức thì; (2) gọi lại API nền (SWR).
  useEffect(() => {
    // (1) Cache cũ — giữ cả list đã "Xem thêm" + vị trí cuộn.
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const c = JSON.parse(raw) as FeedCache;
        if (c.posts?.length) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- khôi phục cache 1 lần khi mount (SWR), tránh blank
          setPosts(c.posts);
          setDone(c.done);
          requestAnimationFrame(() => window.scrollTo(0, c.scrollY ?? 0));
        }
      }
    } catch {
      /* im lặng */
    }

    // (2) Làm tươi nền. Chỉ thay khi đang ở đầu feed & chưa mở thêm -> không nhảy.
    let alive = true;
    getFreshFeed(pageSize)
      .then((fresh) => {
        if (!alive || fresh.length === 0) return;
        const cur = postsRef.current;
        const atTop = window.scrollY < 200 && cur.length <= pageSize;
        const changed = cur[0]?.id !== fresh[0]?.id || cur.length !== fresh.length;
        if (atTop && changed) {
          setPosts(fresh);
          setDone(fresh.length < pageSize);
        }
      })
      .catch(() => {
        /* im lặng — vẫn còn bản cache */
      });
    return () => {
      alive = false;
    };
  }, [pageSize]);

  // Ghi cache khi list đổi (bỏ qua lần đầu để không đè cache trước khi khôi phục).
  useEffect(() => {
    if (!persistReady.current) {
      persistReady.current = true;
      return;
    }
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ posts, done, scrollY: window.scrollY, ts: Date.now() }),
      );
    } catch {
      /* im lặng */
    }
  }, [posts, done]);

  // Ghi vị trí cuộn (throttle rAF) — để quay về đúng chỗ.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          localStorage.setItem(
            STORE_KEY,
            JSON.stringify({ posts, done, scrollY: window.scrollY, ts: Date.now() }),
          );
        } catch {
          /* im lặng */
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [posts, done]);

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
    <div className="flex flex-col">
      {/* Editorial: phân cách bài bằng hairline (không hộp thẻ). */}
      <div className="divide-y divide-border">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} priority={i === 0} />
        ))}
      </div>

      {done ? (
        <p className="self-center py-12 text-center font-serif text-text-muted">
          Hết rồi. Cảm ơn đã ghé.
        </p>
      ) : (
        <button
          type="button"
          onClick={more}
          disabled={pending}
          className="mt-8 self-center rounded-full border border-border px-5 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        >
          {pending ? "Đang mở…" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}
