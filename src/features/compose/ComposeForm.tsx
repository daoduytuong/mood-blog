"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { createMoment, type ComposeState } from "./actions";
import { resizeImage } from "./resize-image";
import { MOODS, MOOD_CODES, type MoodCode } from "@/lib/moods";

const initial: ComposeState = { error: null };

export function ComposeForm() {
  const [state, formAction] = useActionState(createMoment, initial);
  const [pending, startTransition] = useTransition();
  const [mood, setMood] = useState<MoodCode | "">("");
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = pending;
  const error = localError ?? state.error;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const form = e.currentTarget;
    const caption = (
      form.elements.namedItem("caption") as HTMLTextAreaElement
    ).value.trim();
    const file = fileRef.current?.files?.[0];

    if (!mood) return setLocalError("Chọn một tâm trạng giúp mình nhé.");
    if (!file) return setLocalError("Thêm một tấm ảnh nhé.");

    let blob: Blob;
    try {
      ({ blob } = await resizeImage(file));
    } catch {
      return setLocalError("Ảnh này mình chưa xử lý được, thử ảnh khác nhé.");
    }

    const fd = new FormData();
    fd.set("caption", caption);
    fd.set("mood", mood);
    fd.set("image", blob, "khoanh-khac.webp");
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Ảnh */}
      <div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="block w-full overflow-hidden rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-accent"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview tạm từ blob URL, không cần next/image
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

      {/* Caption */}
      <textarea
        name="caption"
        rows={3}
        placeholder="Hôm nay bạn thấy thế nào?"
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
