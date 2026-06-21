"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listComments,
  insertComment,
  hideComment,
  deleteComment,
  type Comment,
} from "@/lib/db/comments";
import { formatPostDate } from "@/lib/date";
import { MOODS, MOOD_CODES, moodColor, type MoodCode } from "@/lib/moods";
import { commentSchema, replyBodySchema } from "./schema";
import {
  getAnonId,
  getCommenterName,
  setCommenterName,
  lastCommentAt,
  markCommented,
  COMMENT_THROTTLE_MS,
} from "./identity";

// Lớp bình luận công khai. Người xem nhập tên (localStorage) -> đăng ngay.
// Trả lời 2 tầng: CẢ Người xem lẫn Tác giả trả lời được bình luận GỐC (anon reply: migration 0008).
// Badge "tác giả" suy từ user_id = author của bài (server-truth), KHÔNG từ tên gõ.
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
  const [mood, setMood] = useState<MoodCode | null>(null); // tùy chọn
  const [hp, setHp] = useState(""); // honeypot — người thật để trống
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

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

  // Nhiệt kế cảm xúc: gộp tâm trạng người xem đã chọn (theo thứ tự MOOD_CODES).
  const moodCounts = MOOD_CODES.map((code) => ({
    code,
    count: comments.filter((c) => c.mood === code).length,
  })).filter((m) => m.count > 0);

  async function submitTop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Honeypot: chỉ bot điền -> giả vờ xong, không chèn gì (im lặng).
    if (hp) {
      setBody("");
      setMood(null);
      return;
    }
    // Throttle nhẹ chống flood.
    if (Date.now() - lastCommentAt() < COMMENT_THROTTLE_MS) {
      return setError("Từ từ chút nhé — đợi một lát rồi gửi tiếp.");
    }
    const parsed = commentSchema.safeParse({ authorName: name, body });
    if (!parsed.success) {
      return setError(parsed.error.issues[0]?.message ?? "Có gì đó chưa ổn.");
    }
    const draftBody = parsed.data.body;
    const draftName = parsed.data.authorName;
    const draftMood = mood;
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      postId,
      parentId: null,
      userId: null,
      authorName: draftName,
      body: draftBody,
      mood: draftMood,
      isHidden: false,
      createdAt: new Date().toISOString(),
    };
    // Optimistic: lời hiện NGAY + dọn ô (honeypot/throttle đã kiểm ở trên).
    setComments((cs) => [...cs, optimistic]);
    setBody("");
    setMood(null);
    setPending(true);
    try {
      const created = await insertComment(createClient(), {
        postId,
        body: draftBody,
        authorName: draftName,
        mood: draftMood,
        anonId: getAnonId(),
      });
      setCommenterName(draftName);
      markCommented();
      setComments((cs) => cs.map((c) => (c.id === tempId ? created : c)));
    } catch {
      // Lỗi: gỡ lời tạm + KHÔNG mất chữ đã gõ (C2).
      setComments((cs) => cs.filter((c) => c.id !== tempId));
      setBody(draftBody);
      setMood(draftMood);
      setError("Chưa gửi được, thử lại nhé.");
    } finally {
      setPending(false);
    }
  }

  // Chủ nhà ẩn/xoá một bình luận (RLS chỉ cho author của bài).
  async function moderate(id: string, action: "hide" | "delete") {
    const sb = createClient();
    try {
      if (action === "hide") await hideComment(sb, id);
      else await deleteComment(sb, id);
      // Gỡ khỏi danh sách (kể cả trả lời con nếu xoá gốc).
      setComments((cs) => cs.filter((c) => c.id !== id && c.parentId !== id));
    } catch {
      /* im lặng */
    }
  }

  // Trả lời một bình luận GỐC — cho cả Tác giả (badge) lẫn Người xem (anon, có tên).
  async function submitReply(parentId: string) {
    setReplyError(null);
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    const asAuthor = !!user && user.id === authorId;

    try {
      let created: Comment;
      if (asAuthor) {
        const parsed = replyBodySchema.safeParse(replyBody);
        if (!parsed.success) return setReplyError("Viết đôi dòng nhé.");
        created = await insertComment(sb, {
          postId,
          parentId,
          body: parsed.data,
          authorName: user!.email?.split("@")[0] ?? "Tác giả",
          userId: user!.id,
        });
      } else {
        // Khách trả lời: cần tên + nội dung; có throttle như bình luận gốc.
        if (Date.now() - lastCommentAt() < COMMENT_THROTTLE_MS) {
          return setReplyError("Từ từ chút nhé — đợi một lát rồi gửi tiếp.");
        }
        const parsed = commentSchema.safeParse({ authorName: name, body: replyBody });
        if (!parsed.success) {
          return setReplyError(parsed.error.issues[0]?.message ?? "Có gì đó chưa ổn.");
        }
        created = await insertComment(sb, {
          postId,
          parentId,
          body: parsed.data.body,
          authorName: parsed.data.authorName,
          anonId: getAnonId(),
        });
        setCommenterName(parsed.data.authorName);
        markCommented();
      }
      setComments((cs) => [...cs, created]);
      setReplyBody("");
      setReplyTo(null);
    } catch {
      setReplyError("Chưa gửi được, thử lại nhé.");
    }
  }

  return (
    <section id="comments" className="mt-10 scroll-mt-24 border-t border-border pt-6">
      <h2 className="mb-3 text-sm font-medium text-text-muted">
        Đôi lời{roots.length > 0 ? ` (${roots.length})` : ""}
      </h2>

      {/* Nhiệt kế cảm xúc — KHÔNG phải đếm like, mà là "trang này khiến người ta thấy gì". */}
      {moodCounts.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-muted">
          <span>Mọi người thấy</span>
          {moodCounts.map(({ code, count }) => (
            <span key={code} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: moodColor(code) }}
              />
              {MOODS[code].label} · {count}
            </span>
          ))}
        </div>
      )}

      {roots.length === 0 ? (
        <p className="text-sm text-text-muted">
          Chưa có lời nào. Bạn để lại đôi dòng nhé.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {roots.map((c) => (
            <li key={c.id}>
              <CommentItem
                comment={c}
                authorId={authorId}
                canModerate={isAuthor}
                onModerate={moderate}
                pending={c.id.startsWith("temp-")}
              />

              {repliesOf(c.id).map((r) => (
                <div
                  key={r.id}
                  className="ml-4 mt-3 border-l-2 border-border pl-4"
                >
                  <CommentItem
                    comment={r}
                    authorId={authorId}
                    canModerate={isAuthor}
                    onModerate={moderate}
                  />
                </div>
              ))}

              {replyTo === c.id ? (
                <div className="ml-4 mt-3 flex flex-col gap-2">
                  {!isAuthor && (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={40}
                      placeholder="Tên của bạn"
                      className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
                    />
                  )}
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder={isAuthor ? "Trả lời với tư cách chủ nhà…" : "Trả lời…"}
                    className="resize-none rounded-md border border-border bg-surface px-3 py-2 font-serif text-text outline-none focus:border-accent"
                  />
                  {replyError && (
                    <p className="text-xs text-text-muted" role="alert">
                      {replyError}
                    </p>
                  )}
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
                        setReplyError(null);
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
                  onClick={() => {
                    setReplyTo(c.id);
                    setReplyBody("");
                    setReplyError(null);
                  }}
                  className="ml-4 mt-2 text-xs text-accent hover:underline"
                >
                  Trả lời
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Form để lại đôi lời */}
      <form onSubmit={submitTop} className="mt-8 flex flex-col gap-3">
        {/* Honeypot: ẩn với người thật; chỉ bot điền -> bị bỏ qua. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
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

        {/* Tâm trạng — TÙY CHỌN: "bài này khiến bạn thấy…" */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-text-muted">
            Bài này khiến bạn thấy…
          </span>
          {MOOD_CODES.map((code) => {
            const selected = mood === code;
            return (
              <button
                key={code}
                type="button"
                aria-pressed={selected}
                onClick={() => setMood(selected ? null : code)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  selected
                    ? "border-accent text-text"
                    : "border-border text-text-muted hover:text-text"
                }`}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: moodColor(code) }}
                />
                {MOODS[code].label}
              </button>
            );
          })}
        </div>

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
  canModerate = false,
  onModerate,
  pending = false,
}: {
  comment: Comment;
  authorId: string;
  canModerate?: boolean;
  onModerate?: (id: string, action: "hide" | "delete") => void;
  pending?: boolean;
}) {
  // Badge "tác giả" = SERVER-TRUTH: user_id của bình luận trùng author của bài.
  const isAuthorReply = comment.userId != null && comment.userId === authorId;
  return (
    <div
      aria-busy={pending || undefined}
      className={`${comment.mood ? "border-l-2 pl-3" : ""} ${pending ? "opacity-60" : ""}`}
      style={comment.mood ? { borderColor: moodColor(comment.mood) } : undefined}
    >
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
        {comment.mood && (
          <span className="inline-flex items-center gap-1 text-xs text-text-muted">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: moodColor(comment.mood) }}
            />
            {MOODS[comment.mood].label}
          </span>
        )}
        <time dateTime={comment.createdAt} className="text-xs text-text-muted">
          {formatPostDate(comment.createdAt)}
        </time>
      </div>
      <p className="mt-1 whitespace-pre-wrap font-serif leading-relaxed text-text">
        {comment.body}
      </p>
      {canModerate && onModerate && (
        <div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted">
          <button
            type="button"
            onClick={() => onModerate(comment.id, "hide")}
            className="hover:text-text"
          >
            Ẩn
          </button>
          <button
            type="button"
            onClick={() => onModerate(comment.id, "delete")}
            className="underline-offset-2 hover:text-text hover:underline"
          >
            Xoá
          </button>
        </div>
      )}
    </div>
  );
}
