"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { createMoment, createGocDoc, type ComposeState } from "./actions";
import { resizeImage } from "./resize-image";
import { MOODS, MOOD_CODES, type MoodCode } from "@/lib/moods";

const initial: ComposeState = { error: null };
type PostType = "khoanh_khac" | "goc_doc";

export function ComposeForm() {
  const [type, setType] = useState<PostType>("khoanh_khac");
  const [momentState, momentAction] = useActionState(createMoment, initial);
  const [gocDocState, gocDocAction] = useActionState(createGocDoc, initial);
  const [pending, startTransition] = useTransition();
  const [mood, setMood] = useState<MoodCode | "">("");
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = pending;
  const error = localError ?? momentState.error ?? gocDocState.error;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function fieldValue(form: HTMLFormElement, name: string): string {
    const el = form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    return el?.value.trim() ?? "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const form = e.currentTarget;
    if (!mood) return setLocalError("Chọn một tâm trạng giúp mình nhé.");

    const caption = fieldValue(form, "caption");

    if (type === "khoanh_khac") {
      const file = fileRef.current?.files?.[0];
      if (!file) return setLocalError("Thêm một tấm ảnh nhé.");
      let blob: Blob, width: number, height: number, blurDataURL: string;
      try {
        ({ blob, width, height, blurDataURL } = await resizeImage(file));
      } catch {
        return setLocalError("Ảnh này mình chưa xử lý được, thử ảnh khác nhé.");
      }
      const fd = new FormData();
      fd.set("caption", caption);
      fd.set("mood", mood);
      fd.set("image", blob, "khoanh-khac.webp");
      fd.set("width", String(width));
      fd.set("height", String(height));
      fd.set("blurDataURL", blurDataURL);
      startTransition(() => momentAction(fd));
    } else {
      const linkUrl = fieldValue(form, "linkUrl");
      const excerpt = fieldValue(form, "excerpt");
      if (!linkUrl && !excerpt)
        return setLocalError("Thêm một link hoặc đoạn trích nhé.");
      const fd = new FormData();
      fd.set("linkUrl", linkUrl);
      fd.set("excerpt", excerpt);
      fd.set("caption", caption);
      fd.set("mood", mood);
      startTransition(() => gocDocAction(fd));
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Chọn loại bài */}
      <div className="flex gap-1 self-start rounded-full border border-border p-1 text-sm">
        {(
          [
            ["khoanh_khac", "Khoảnh khắc"],
            ["goc_doc", "Góc đọc"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            onClick={() => setType(value)}
            className={`rounded-full px-3 py-1 transition-colors ${
              type === value
                ? "bg-accent text-on-accent"
                : "text-text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {type === "khoanh_khac" ? (
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="block w-full overflow-hidden rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-accent"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview tạm từ blob URL
              <img
                src={preview}
                alt="Xem trước"
                className="h-64 w-full object-cover"
              />
            ) : (
              <span className="flex h-40 items-center justify-center text-sm">
                Chạm để chọn một tấm ảnh
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickFile}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <input
            type="url"
            name="linkUrl"
            placeholder="Dán link (tuỳ chọn)"
            className="rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          />
          <textarea
            name="excerpt"
            rows={3}
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
        placeholder={
          type === "khoanh_khac"
            ? "Hôm nay bạn thấy thế nào?"
            : "Vì sao bạn thích điều này?"
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

      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-md bg-accent px-5 py-2 text-on-accent transition-opacity disabled:opacity-60"
      >
        {busy ? "Đang lưu…" : "Đăng"}
      </button>
    </form>
  );
}
