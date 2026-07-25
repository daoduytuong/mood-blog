"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  createMomentImages,
  createMomentVideo,
  createGocDoc,
  createJourney,
  type ComposeState,
} from "./actions";
import { resizeImage } from "./resize-image";
import { MOODS, MOOD_CODES, type MoodCode } from "@/lib/moods";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGES = 10;

const initial: ComposeState = { error: null };
type PostType = "khoanh_khac" | "goc_doc" | "hanh_trinh";
type MomentKind = "image" | "video"; // Khoảnh khắc: ảnh hoặc video Vimeo

// YYYY-MM-DD theo giờ máy người dùng (giờ VN) — cho ô ngày của Hành trình.
function localToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

type Picked = { file: File; url: string };

export function ComposeForm() {
  const [type, setType] = useState<PostType>("khoanh_khac");
  const [momentKind, setMomentKind] = useState<MomentKind>("image");
  const [imagesState, imagesAction] = useActionState(createMomentImages, initial);
  const [videoState, videoAction] = useActionState(createMomentVideo, initial);
  const [gocDocState, gocDocAction] = useActionState(createGocDoc, initial);
  const [journeyState, journeyAction] = useActionState(createJourney, initial);
  // Ngày local (VN); SSR có thể ra ngày UTC khác trong 00:00–07:00 -> suppressHydrationWarning ở input.
  const [entryDate, setEntryDate] = useState(() => localToday());
  const [pending, startTransition] = useTransition();
  const [mood, setMood] = useState<MoodCode | "">("");
  const [images, setImages] = useState<Picked[]>([]);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<Picked[]>([]);

  // Giữ ref đồng bộ để cleanup effect đọc được bản mới nhất (tránh stale closure).
  useEffect(() => { imagesRef.current = images; });

  const busy = pending || uploading;
  const error =
    localError ??
    imagesState.error ??
    videoState.error ??
    gocDocState.error ??
    journeyState.error;

  // Thu hồi tất cả blob URL khi unmount.
  useEffect(() => () => { imagesRef.current.forEach((im) => URL.revokeObjectURL(im.url)); }, []);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImages((prev) => {
      const room = MAX_IMAGES - prev.length;
      const add = files.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }));
      return [...prev, ...add];
    });
    e.target.value = ""; // cho chọn lại cùng file
  }

  function removeImage(i: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, k) => k !== i);
    });
  }

  function fieldValue(form: HTMLFormElement, name: string): string {
    const el = form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    return el?.value.trim() ?? "";
  }

  // Resize + upload các ảnh đã chọn lên Storage. Trả null nếu lỗi (đã setLocalError).
  async function uploadPicked(
    list: Picked[],
  ): Promise<{ path: string; w: number; h: number; blurDataURL: string }[] | null> {
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLocalError("Bạn cần đăng nhập đã nhé."); return null; }
      const media: { path: string; w: number; h: number; blurDataURL: string }[] = [];
      for (const im of list) {
        let r;
        try { r = await resizeImage(im.file); }
        catch { setLocalError("Một tấm ảnh chưa xử lý được, thử ảnh khác nhé."); return null; }
        const path = `${user.id}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, r.blob, { contentType: "image/webp", upsert: false });
        if (upErr) { setLocalError("Chưa tải được ảnh lên, thử lại nhé."); return null; }
        media.push({ path, w: r.width, h: r.height, blurDataURL: r.blurDataURL });
      }
      return media;
    } catch {
      setLocalError("Có lỗi khi tải ảnh, thử lại nhé.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const form = e.currentTarget;
    if (!mood) return setLocalError("Chọn một tâm trạng giúp mình nhé.");

    const caption = fieldValue(form, "caption");

    if (type === "khoanh_khac" && momentKind === "video") {
      const videoUrl = fieldValue(form, "videoUrl");
      if (!videoUrl) return setLocalError("Dán link video Vimeo nhé.");
      const fd = new FormData();
      fd.set("caption", caption);
      fd.set("mood", mood);
      fd.set("videoUrl", videoUrl);
      startTransition(() => videoAction(fd));
    } else if (type === "khoanh_khac") {
      if (images.length === 0) return setLocalError("Thêm ít nhất một tấm ảnh nhé.");
      const media = await uploadPicked(images);
      if (!media) return;
      const fd = new FormData();
      fd.set("caption", caption);
      fd.set("mood", mood);
      fd.set("media", JSON.stringify(media));
      startTransition(() => imagesAction(fd));
    } else if (type === "hanh_trinh") {
      if (images.length === 0)
        return setLocalError("Thêm một tấm ảnh cho chặng đầu tiên nhé.");
      if (images.length > 1)
        return setLocalError("Hành trình mỗi chặng chỉ một ảnh — bỏ bớt nhé.");
      const media = await uploadPicked(images);
      if (!media) return;
      const fd = new FormData();
      fd.set("caption", caption);
      fd.set("mood", mood);
      fd.set("media", JSON.stringify(media));
      fd.set("note", fieldValue(form, "entryNote"));
      fd.set("date", entryDate || localToday());
      startTransition(() => journeyAction(fd));
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
            ["hanh_trinh", "Hành trình"],
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
        <div className="flex flex-col gap-4">
          {/* Ảnh hay video */}
          <div className="flex gap-1 self-start rounded-full border border-border p-1 text-xs">
            {(
              [
                ["image", "Ảnh"],
                ["video", "Video"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={momentKind === value}
                onClick={() => setMomentKind(value)}
                className={`rounded-full px-3 py-1 transition-colors ${
                  momentKind === value
                    ? "bg-accent text-on-accent"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {momentKind === "image" ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {images.map((im, i) => (
                  <div key={im.url} className="relative aspect-square overflow-hidden rounded-md border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview blob tạm */}
                    <img src={im.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={`Bỏ ảnh ${i + 1}`}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-surface/90 text-text shadow-soft transition-colors hover:text-accent"
                    >×</button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
                  >+ Ảnh</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />
              <p className="text-xs text-text-muted">Tối đa {MAX_IMAGES} ảnh · vuốt để xem trong feed.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="url"
                name="videoUrl"
                placeholder="Dán link Vimeo (vd vimeo.com/123456789)"
                className="rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              />
              <p className="text-xs text-text-muted">
                Chỉ hỗ trợ Vimeo. Video sẽ hiện ảnh tĩnh, chạm mới phát.
              </p>
            </div>
          )}
        </div>
      ) : type === "hanh_trinh" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {images.map((im, i) => (
                <div key={im.url} className="relative aspect-square overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- preview blob tạm */}
                  <img src={im.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Bỏ ảnh ${i + 1}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-surface/90 text-text shadow-soft transition-colors hover:text-accent"
                  >×</button>
                </div>
              ))}
              {images.length < 1 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
                >+ Ảnh</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickFiles} className="hidden" />
            <p className="text-xs text-text-muted">
              Một ảnh cho chặng đầu tiên · các chặng sau thêm ngay trên trang bài.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <input
              type="date"
              name="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              suppressHydrationWarning
              aria-label="Ngày của chặng đầu tiên"
              className="rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            />
            <input
              type="text"
              name="entryNote"
              maxLength={500}
              placeholder="Ghi chú chặng này (tuỳ chọn)"
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            />
          </div>
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
            : type === "hanh_trinh"
              ? "Hành trình này là gì? (vd: Tập gym)"
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
