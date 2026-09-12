"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listAlbumComments,
  insertAlbumComment,
  hideAlbumComment,
  deleteAlbumComment,
  type AlbumComment,
} from "@/lib/db/album-comments";
import { formatPostDate } from "@/lib/date";
import { commentSchema, replyBodySchema } from "@/features/comments/schema";
import {
  getAnonId,
  getCommenterName,
  setCommenterName,
  lastCommentAt,
  markCommented,
  COMMENT_THROTTLE_MS,
} from "@/features/comments/identity";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

function AlbumCommentItem({
  c,
  authorId,
  canModerate,
  onModerate,
}: {
  c: AlbumComment;
  authorId: string;
  canModerate: boolean;
  onModerate: (id: string, action: "hide" | "delete") => void;
}) {
  const isAuthorReply = c.userId != null && c.userId === authorId;
  return (
    <div aria-busy={c.id.startsWith("temp-") || undefined} className={c.id.startsWith("temp-") ? "opacity-60" : ""}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`text-sm ${isAuthorReply ? "font-semibold" : "font-medium"} text-text`}>{c.authorName}</span>
        {isAuthorReply && (
          <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-text">tác giả</span>
        )}
        <time dateTime={c.createdAt} className="text-xs text-text-muted">{formatPostDate(c.createdAt)}</time>
      </div>
      <p className="mt-1 whitespace-pre-wrap font-serif leading-relaxed text-text">{c.body}</p>
      {canModerate && (
        <div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted">
          <button type="button" onClick={() => onModerate(c.id, "hide")} className="hover:text-text">Ẩn</button>
          <button type="button" onClick={() => onModerate(c.id, "delete")} className="underline-offset-2 hover:text-text hover:underline">Xoá</button>
        </div>
      )}
    </div>
  );
}

export function AlbumCommentSection({
  albumId,
  authorId,
  initialComments,
}: {
  albumId: string;
  authorId: string;
  initialComments: AlbumComment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [isAuthor, setIsAuthor] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [hp, setHp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    listAlbumComments(sb, albumId).then(setComments);
    sb.auth.getUser().then(({ data }) => setIsAuthor(!!data.user && data.user.id === authorId));
    Promise.resolve().then(() => {
      const n = getCommenterName();
      if (n) setName(n);
    });
  }, [albumId, authorId]);

  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  async function submitTop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (hp) {
      setBody("");
      return;
    }
    if (Date.now() - lastCommentAt() < COMMENT_THROTTLE_MS)
      return setError("Từ từ chút nhé — đợi một lát rồi gửi tiếp.");
    const parsed = commentSchema.safeParse({ authorName: name, body });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Có gì đó chưa ổn.");
    const tempId = `temp-${Date.now()}`;
    const optimistic: AlbumComment = {
      id: tempId,
      albumId,
      parentId: null,
      userId: null,
      authorName: parsed.data.authorName,
      body: parsed.data.body,
      isHidden: false,
      createdAt: new Date().toISOString(),
    };
    setComments((cs) => [...cs, optimistic]);
    setBody("");
    setPending(true);
    try {
      const created = await insertAlbumComment(createClient(), {
        albumId,
        body: parsed.data.body,
        authorName: parsed.data.authorName,
        anonId: getAnonId(),
      });
      setCommenterName(parsed.data.authorName);
      markCommented();
      setComments((cs) => cs.map((c) => (c.id === tempId ? created : c)));
    } catch {
      setComments((cs) => cs.filter((c) => c.id !== tempId));
      setBody(parsed.data.body);
      setError("Chưa gửi được, thử lại nhé.");
    } finally {
      setPending(false);
    }
  }

  async function moderate(id: string, action: "hide" | "delete") {
    const sb = createClient();
    try {
      if (action === "hide") await hideAlbumComment(sb, id);
      else await deleteAlbumComment(sb, id);
      setComments((cs) => cs.filter((c) => c.id !== id && c.parentId !== id));
    } catch {}
  }

  async function submitReply(parentId: string) {
    setReplyError(null);
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    const asAuthor = !!user && user.id === authorId;
    try {
      let created: AlbumComment;
      if (asAuthor) {
        const parsed = replyBodySchema.safeParse(replyBody);
        if (!parsed.success) return setReplyError("Viết đôi dòng nhé.");
        created = await insertAlbumComment(sb, {
          albumId,
          parentId,
          body: parsed.data,
          authorName: user!.email?.split("@")[0] ?? "Tác giả",
          userId: user!.id,
        });
      } else {
        if (Date.now() - lastCommentAt() < COMMENT_THROTTLE_MS)
          return setReplyError("Từ từ chút nhé — đợi một lát rồi gửi tiếp.");
        const parsed = commentSchema.safeParse({ authorName: name, body: replyBody });
        if (!parsed.success) return setReplyError(parsed.error.issues[0]?.message ?? "Có gì đó chưa ổn.");
        created = await insertAlbumComment(sb, {
          albumId,
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
      {roots.length === 0 ? (
        <p className="text-sm text-text-muted">Chưa có lời nào. Bạn để lại đôi dòng nhé.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {roots.map((c) => (
            <li key={c.id}>
              <AlbumCommentItem c={c} authorId={authorId} canModerate={isAuthor} onModerate={moderate} />
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="ml-4 mt-3 border-l-2 border-border pl-4">
                  <AlbumCommentItem c={r} authorId={authorId} canModerate={isAuthor} onModerate={moderate} />
                </div>
              ))}
              {replyTo === c.id ? (
                <div className="ml-4 mt-3 flex flex-col gap-2">
                  {!isAuthor && (
                    <Input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Tên của bạn" aria-label="Tên của bạn" />
                  )}
                  <Textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={2} maxLength={500} placeholder={isAuthor ? "Trả lời với tư cách chủ nhà…" : "Trả lời…"} aria-label="Nội dung trả lời" className="font-serif" />
                  {replyError && <FormError>{replyError}</FormError>}
                  <div className="flex items-center gap-3">
                    <Button type="button" size="sm" onClick={() => submitReply(c.id)}>Gửi trả lời</Button>
                    <button type="button" onClick={() => { setReplyTo(null); setReplyBody(""); setReplyError(null); }} className="text-sm text-text-muted hover:text-text">Huỷ</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setReplyTo(c.id); setReplyBody(""); setReplyError(null); }} className="ml-4 mt-2 text-xs text-accent-text hover:underline">Trả lời</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submitTop} className="mt-8 flex flex-col gap-3">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={hp} onChange={(e) => setHp(e.target.value)} style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Tên của bạn" aria-label="Tên của bạn" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={500} placeholder="Đôi lời gửi tới…" aria-label="Đôi lời gửi tới" className="font-serif" />
        {error && <FormError>{error}</FormError>}
        <Button type="submit" className="self-start" loading={pending} loadingLabel="Đang gửi…">Gửi</Button>
      </form>
    </section>
  );
}
