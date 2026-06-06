"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listComments, insertComment, type Comment } from "@/lib/db/comments";
import { formatPostDate } from "@/lib/date";
import { commentSchema, replyBodySchema } from "./schema";
import { getAnonId, getCommenterName, setCommenterName } from "./identity";

// Lớp bình luận công khai (Phase-2 Lát 1). Người xem nhập tên (localStorage) -> đăng ngay;
// CHỈ tác giả (đăng nhập) trả lời 1 tầng (mô hình "chủ nhà"). Badge "tác giả" suy từ user_id.
export function CommentSection({
  postId,
  authorId,
  initialComments,
}: {
  postId: string;
  authorId: string;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isAuthor, setIsAuthor] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  // Danh tính khách + làm tươi danh sách (vượt cache ISR) + kiểm có phải tác giả.
  useEffect(() => {
    const sb = createClient();
    listComments(sb, postId).then(setComments);
    sb.auth
      .getUser()
      .then(({ data }) => setIsAuthor(!!data.user && data.user.id === authorId));
    // Đọc tên đã lưu sau hydrate (deferred -> tránh setState đồng bộ trong effect).
    Promise.resolve().then(() => {
      const n = getCommenterName();
      if (n) setName(n);
    });
  }, [postId, authorId]);

  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) =>
    comments.filter((c) => c.parentId === id);

  async function submitTop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = commentSchema.safeParse({ authorName: name, body });
    if (!parsed.success) {
      return setError(parsed.error.issues[0]?.message ?? "Có gì đó chưa ổn.");
    }
    setPending(true);
    try {
      const created = await insertComment(createClient(), {
        postId,
        body: parsed.data.body,
        authorName: parsed.data.authorName,
        anonId: getAnonId(),
      });
      setCommenterName(parsed.data.authorName);
      setComments((cs) => [...cs, created]);
      setBody("");
    } catch {
      setError("Chưa gửi được, thử lại nhé.");
    } finally {
      setPending(false);
    }
  }

  async function submitReply(parentId: string) {
    const parsed = replyBodySchema.safeParse(replyBody);
    if (!parsed.success) return;
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    try {
      const created = await insertComment(sb, {
        postId,
        parentId,
        body: parsed.data,
        authorName: user.email?.split("@")[0] ?? "Tác giả",
        userId: user.id,
      });
      setComments((cs) => [...cs, created]);
      setReplyBody("");
      setReplyTo(null);
    } catch {
      /* im lặng */
    }
  }

  return (
    <section className="mt-10 border-t border-border pt-6">
      <h2 className="mb-5 text-sm font-medium text-text-muted">
        Đôi lời{roots.length > 0 ? ` (${roots.length})` : ""}
      </h2>

      {roots.length === 0 ? (
        <p className="text-sm text-text-muted">
          Chưa có lời nào. Bạn để lại đôi dòng nhé.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {roots.map((c) => (
            <li key={c.id}>
              <CommentItem comment={c} authorId={authorId} />

              {repliesOf(c.id).map((r) => (
                <div
                  key={r.id}
                  className="ml-4 mt-3 border-l-2 border-border pl-4"
                >
                  <CommentItem comment={r} authorId={authorId} />
                </div>
              ))}

              {isAuthor &&
                (replyTo === c.id ? (
                  <div className="ml-4 mt-3 flex flex-col gap-2">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={2}
                      placeholder="Trả lời với tư cách chủ nhà…"
                      className="resize-none rounded-md border border-border bg-surface px-3 py-2 font-serif text-text outline-none focus:border-accent"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => submitReply(c.id)}
                        className="rounded-md bg-accent px-3 py-1.5 text-sm text-on-accent"
                      >
                        Gửi trả lời
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(null);
                          setReplyBody("");
                        }}
                        className="text-sm text-text-muted hover:text-text"
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReplyTo(c.id)}
                    className="ml-4 mt-2 text-xs text-accent hover:underline"
                  >
                    Trả lời
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}

      {/* Form để lại đôi lời */}
      <form onSubmit={submitTop} className="mt-8 flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Tên của bạn"
          className="rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Đôi lời gửi tới…"
          className="resize-none rounded-md border border-border bg-surface px-3 py-2 font-serif text-text outline-none focus:border-accent"
        />
        {error && (
          <p className="text-sm text-text-muted" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-accent px-5 py-2 text-on-accent transition-opacity disabled:opacity-60"
        >
          {pending ? "Đang gửi…" : "Gửi"}
        </button>
      </form>
    </section>
  );
}

function CommentItem({
  comment,
  authorId,
}: {
  comment: Comment;
  authorId: string;
}) {
  // Badge "tác giả" = SERVER-TRUTH: user_id của bình luận trùng author của bài.
  const isAuthorReply = comment.userId != null && comment.userId === authorId;
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={
            isAuthorReply
              ? "text-sm font-semibold text-text"
              : "text-sm font-medium text-text"
          }
        >
          {comment.authorName}
        </span>
        {isAuthorReply && (
          <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent">
            tác giả
          </span>
        )}
        <time dateTime={comment.createdAt} className="text-xs text-text-muted">
          {formatPostDate(comment.createdAt)}
        </time>
      </div>
      <p className="mt-1 whitespace-pre-wrap font-serif leading-relaxed text-text">
        {comment.body}
      </p>
    </div>
  );
}
