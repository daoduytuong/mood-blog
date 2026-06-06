"use client";

import { useActionState, useState, useTransition } from "react";
import { updatePostAction, type ComposeState } from "./actions";
import { MOODS, MOOD_CODES, type MoodCode } from "@/lib/moods";

const initial: ComposeState = { error: null };

export interface EditFormProps {
  id: string;
  slug: string;
  type: "khoanh_khac" | "goc_doc";
  initialMood: MoodCode;
  initialCaption: string;
  initialExcerpt: string;
  initialLinkUrl: string;
}

// Story 1.7 — sửa nội dung + tâm trạng. KHÔNG đổi ảnh, KHÔNG đổi loại, KHÔNG đổi slug.
export function EditForm({
  id,
  slug,
  type,
  initialMood,
  initialCaption,
  initialExcerpt,
  initialLinkUrl,
}: EditFormProps) {
  const [state, action] = useActionState(updatePostAction, initial);
  const [pending, startTransition] = useTransition();
  const [mood, setMood] = useState<MoodCode>(initialMood);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError ?? state.error;
  const isMoment = type === "khoanh_khac";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", id);
    fd.set("slug", slug);
    fd.set("type", type);
    fd.set("mood", mood);

    if (!isMoment) {
      const linkUrl = String(fd.get("linkUrl") ?? "").trim();
      const excerpt = String(fd.get("excerpt") ?? "").trim();
      if (!linkUrl && !excerpt)
        return setLocalError("Thêm một link hoặc đoạn trích nhé.");
    }
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {!isMoment && (
        <div className="flex flex-col gap-4">
          <input
            type="url"
            name="linkUrl"
            defaultValue={initialLinkUrl}
            placeholder="Dán link (tuỳ chọn)"
            className="rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          />
          <textarea
            name="excerpt"
            rows={3}
            defaultValue={initialExcerpt}
            placeholder="Một đoạn bạn tâm đắc…"
            className="resize-none rounded-md border border-border bg-surface px-3 py-2 italic text-text outline-none focus:border-accent"
            style={{ fontFamily: "var(--font-serif)" }}
          />
        </div>
      )}

      {/* Caption / cảm nhận */}
      <textarea
        name="caption"
        rows={3}
        defaultValue={initialCaption}
        placeholder={
          isMoment ? "Hôm nay bạn thấy thế nào?" : "Vì sao bạn thích điều này?"
        }
        className="resize-none rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
        style={{ fontFamily: "var(--font-serif)" }}
      />

      {/* Tâm trạng */}
      <div>
        <p className="mb-2 text-sm text-text-muted">Tâm trạng</p>
        <div className="flex flex-wrap gap-2">
          {MOOD_CODES.map((code) => {
            const selected = mood === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setMood(code)}
                aria-pressed={selected}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selected
                    ? "border-accent text-text"
                    : "border-border text-text-muted hover:text-text"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: `var(${MOODS[code].tokenVar})` }}
                />
                {MOODS[code].label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-text-muted" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-5 py-2 text-on-accent transition-opacity disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
        <a
          href={`/m/${slug}`}
          className="text-sm text-text-muted hover:text-text"
        >
          Huỷ
        </a>
      </div>
    </form>
  );
}
