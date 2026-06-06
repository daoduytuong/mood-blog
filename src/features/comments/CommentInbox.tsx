"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { hideComment, deleteComment, type Comment } from "@/lib/db/comments";
import { formatPostDate } from "@/lib/date";

const SEEN_KEY = "mb_inbox_seen";

export interface InboxPost {
  slug: string;
  title: string;
}

// Hộp thư chủ nhà ở /me: lời người xem gửi tới, kèm chấm báo "mới" + ẩn/xoá 1 chạm. (Lát 2)
export function CommentInbox({
  initial,
  posts,
}: {
  initial: Comment[];
  posts: Record<string, InboxPost>;
}) {
  const [comments, setComments] = useState<Comment[]>(initial);
  // Đến khi đọc được mốc đã-xem thì coi như đã xem hết (tránh nháy chấm "mới").
  const [seenAt, setSeenAt] = useState<number>(Number.MAX_SAFE_INTEGER);

  useEffect(() => {
    // Đọc mốc đã-xem (deferred -> tránh setState đồng bộ trong effect) rồi đánh dấu = bây giờ.
    Promise.resolve().then(() => {
      let prev = 0;
      try {
        prev = Number(localStorage.getItem(SEEN_KEY) ?? 0);
      } catch {
        /* bỏ qua */
      }
      setSeenAt(prev);
      try {
        localStorage.setItem(SEEN_KEY, String(Date.now()));
      } catch {
        /* bỏ qua */
      }
    });
  }, []);

  async function moderate(id: string, action: "hide" | "delete") {
    const sb = createClient();
    try {
      if (action === "hide") await hideComment(sb, id);
      else await deleteComment(sb, id);
      setComments((cs) => cs.filter((c) => c.id !== id));
    } catch {
      /* im lặng */
    }
  }

  if (comments.length === 0) {
    return <p className="text-sm text-text-muted">Chưa có lời nào gửi tới.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {comments.map((c) => {
        const post = posts[c.postId];
        const isUnread = new Date(c.createdAt).getTime() > seenAt;
        return (
          <li key={c.id} className="flex flex-col gap-1 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {isUnread && (
                <span
                  aria-label="mới"
                  className="h-2 w-2 rounded-full bg-accent"
                />
              )}
              <span className="text-sm font-medium text-text">
                {c.authorName}
              </span>
              <time
                dateTime={c.createdAt}
                className="text-xs text-text-muted"
              >
                {formatPostDate(c.createdAt)}
              </time>
            </div>
            <p className="line-clamp-2 font-serif text-sm text-text">
              {c.body}
            </p>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              {post && (
                <Link
                  href={`/m/${post.slug}`}
                  className="max-w-[55%] truncate text-accent hover:underline"
                >
                  {post.title}
                </Link>
              )}
              <button
                type="button"
                onClick={() => moderate(c.id, "hide")}
                className="hover:text-text"
              >
                Ẩn
              </button>
              <button
                type="button"
                onClick={() => moderate(c.id, "delete")}
                className="underline-offset-2 hover:text-text hover:underline"
              >
                Xoá
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
