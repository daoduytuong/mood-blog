"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PostCard } from "@/components/post/PostCard";
import { Button } from "@/components/ui/Button";
import { loadMorePosts, getFreshFeed } from "./actions";
import type { Post } from "@/lib/db/posts";
import type { MoodCode } from "@/lib/moods";

// v2: Post có thêm heartCount (cache v1 thiếu field -> bỏ, tự hết hạn trong localStorage).
// Mỗi tâm trạng có KHOÁ RIÊNG: dùng chung một khoá thì cache của feed đầy đủ và
// của trang lọc sẽ đè lẫn nhau (trang lọc "mọc" thêm bài mood khác khi back lại).
const STORE_KEY_BASE = "feed:cache:v2";
function storeKey(mood?: MoodCode) {
  return mood ? `${STORE_KEY_BASE}:${mood}` : STORE_KEY_BASE;
}

type FeedCache = { posts: Post[]; done: boolean; scrollY: number; ts: number };

// Cache quá hạn thì bỏ hẳn (thà chờ server một nhịp còn hơn hiện bài rất cũ).
const CACHE_MAX_AGE_MS = 30 * 60_000;

// So NỘI DUNG hiển thị của một bài (không chỉ id) — để bắt các sửa tại chỗ:
// đổi ảnh/thêm-gỡ chặng (media), sửa caption/trích, đổi mood, số tim/bình luận đổi.
function samePost(a: Post, b: Post): boolean {
  return (
    a.id === b.id &&
    a.caption === b.caption &&
    a.excerpt === b.excerpt &&
    a.linkUrl === b.linkUrl &&
    a.mood === b.mood &&
    a.heartCount === b.heartCount &&
    a.commentCount === b.commentCount &&
    JSON.stringify(a.media) === JSON.stringify(b.media)
  );
}

// Feed CÓ ĐÁY: "Xem thêm" thủ công (keyset) + điểm dừng ấm. KHÔNG vô-tận-cuộn.
// Cache localStorage (stale-while-revalidate): quay về feed thấy NGAY bản cũ + giữ vị trí cuộn,
// đồng thời gọi lại API nền.
//
// Quy tắc cache (đã sửa 2 lỗi: bài mới "hiện rồi mất", và sửa ảnh không cập nhật):
//  1. KHÔNG đè cache lên dữ liệu server: server (ISR, đã revalidate sau mỗi lần đăng/sửa) là
//     chân lý cho TRANG ĐẦU. Cache chỉ dùng để khôi phục các trang đã "Xem thêm" + vị trí cuộn,
//     và chỉ khi phần đầu của cache khớp server (cùng bài đầu) -> cache là phần nối dài, không cũ hơn.
//  2. Làm tươi nền: nếu tập id KHÔNG đổi -> luôn thay tại chỗ (ảnh/caption/số tim mới) vì
//     không có bài nào chen vào nên không nhảy layout. Chỉ khi tập id ĐỔI mới cần ở đầu feed.
export function FeedList({
  initial,
  pageSize,
  mood,
}: {
  initial: Post[];
  pageSize: number;
  /** Có mặt -> đang ở trang lọc: mọi lần nạp thêm/làm tươi phải giữ đúng bộ lọc. */
  mood?: MoodCode;
}) {
  const STORE_KEY = storeKey(mood);
  const [posts, setPosts] = useState<Post[]>(initial);
  const [done, setDone] = useState(initial.length < pageSize);
  const [pending, setPending] = useState(false);
  const postsRef = useRef<Post[]>(initial);
  const persistReady = useRef(false);
  const restored = useRef(false);
  const lastInitial = useRef<Post[]>(initial);

  // Giữ ref đồng bộ (đọc trong callback revalidate async) — cập nhật trong effect, không trong render.
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // Server gửi `initial` MỚI (sau revalidatePath khi đăng/sửa bài) -> nhận ngay,
  // giữ phần đuôi đã "Xem thêm". Server là chân lý, KHÔNG để cache cũ đè lên.
  useEffect(() => {
    if (lastInitial.current === initial) return;
    lastInitial.current = initial;
    setPosts((cur) =>
      cur.length > initial.length && cur[0]?.id === initial[0]?.id
        ? [...initial, ...cur.slice(initial.length)]
        : initial,
    );
  }, [initial]);

  // (1) Khôi phục các trang đã "Xem thêm" — CHỈ MỘT LẦN khi mount.
  // (2) Làm tươi nền (SWR) — bắt thay đổi xảy ra sau khi trang được ISR-cache.
  useEffect(() => {
    // Cache CHỈ để nối dài `initial`, KHÔNG thay thế nó:
    //   - cache phải mới hơn CACHE_MAX_AGE_MS,
    //   - bài đầu của cache phải trùng bài đầu server (lệch = server đã có bài mới -> bỏ cache),
    //   - và phải dài hơn `initial` (người dùng từng bấm "Xem thêm").
    // Nhờ vậy bài mới đăng không bao giờ bị cache cũ nuốt mất.
    if (!restored.current) {
      restored.current = true;
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
          const c = JSON.parse(raw) as FeedCache;
          const usable = Date.now() - (c.ts ?? 0) < CACHE_MAX_AGE_MS;
          const sameHead = c.posts?.[0]?.id === initial[0]?.id;
          if (usable && sameHead && c.posts.length > initial.length) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- khôi phục 1 lần khi mount (SWR)
            setPosts([...initial, ...c.posts.slice(initial.length)]);
            setDone(c.done);
            requestAnimationFrame(() => window.scrollTo(0, c.scrollY ?? 0));
          } else if (!usable || !sameHead) {
            localStorage.removeItem(STORE_KEY); // cache lạc hậu -> dọn luôn
          }
        }
      } catch {
        /* im lặng */
      }
    }

    let alive = true;
    getFreshFeed(pageSize, mood)
      .then((fresh) => {
        if (!alive || fresh.length === 0) return;
        const cur = postsRef.current;
        const head = cur.slice(0, fresh.length);
        const sameIds =
          head.length === fresh.length &&
          head.every((p, i) => p.id === fresh[i].id);

        if (sameIds) {
          // Cùng tập bài, chỉ NỘI DUNG đổi (ảnh chặng, caption, mood, số tim...):
          // thay tại chỗ — không bài nào chen vào nên feed không nhảy.
          const changed = head.some(
            (p, i) => !samePost(p, fresh[i]),
          );
          if (changed) setPosts([...fresh, ...cur.slice(fresh.length)]);
          return;
        }

        // Tập bài ĐỔI (có bài mới/bị xoá) -> chỉ thay khi đang ở đầu feed & chưa mở thêm,
        // để không "chen" bài giữa lúc đang đọc.
        if (window.scrollY < 200 && cur.length <= pageSize) {
          setPosts(fresh);
          setDone(fresh.length < pageSize);
        }
      })
      .catch(() => {
        /* im lặng — vẫn còn bản đang hiện */
      });
    return () => {
      alive = false;
    };
  }, [pageSize, initial, mood, STORE_KEY]);

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
  }, [posts, done, STORE_KEY]);

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
  }, [posts, done, STORE_KEY]);

  async function more() {
    const last = posts[posts.length - 1];
    if (!last || pending) return;
    setPending(true);
    try {
      const next = await loadMorePosts(
        { createdAt: last.createdAt, id: last.id },
        pageSize,
        mood,
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
      {/* "Nguyên bản": card rời trên nền linen; mobile full-bleed (âm margin so với px-4.5 của page). */}
      <div className="-mx-4.5 flex flex-col gap-3 sm:mx-0 sm:gap-6">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} priority={i === 0} />
        ))}
      </div>

      {done ? (
        // Điểm dừng ấm — cũng là nơi duy nhất dẫn sang /lich và /gioi-thieu:
        // đặt ở đáy để vỏ điều hướng phía trên vẫn tĩnh, chỉ wordmark + toggle.
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-text-muted">Hết rồi. Cảm ơn đã ghé.</p>
          <p className="flex items-center gap-4 text-sm">
            <Link href="/lich" className="text-accent-text hover:underline">
              Lịch cảm xúc
            </Link>
            <Link
              href="/gioi-thieu"
              className="text-text-muted transition-colors hover:text-text"
            >
              Giới thiệu
            </Link>
          </p>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={more}
          loading={pending}
          loadingLabel="Đang mở…"
          className="mt-6 self-center"
        >
          Xem thêm
        </Button>
      )}
    </div>
  );
}
