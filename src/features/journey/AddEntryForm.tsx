"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addJourneyEntry, type ComposeState } from "@/features/compose/actions";
import { resizeImage } from "@/features/compose/resize-image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

const initial: ComposeState = { error: null };

// YYYY-MM-DD theo giờ máy người dùng (giờ VN).
function localToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

// Thêm một "chặng" vào bài Hành trình: 1 ảnh + ngày + ghi chú tuỳ chọn.
// Ảnh upload client-side lên Storage (như ComposeForm) — action chỉ append media.
export function AddEntryForm({ id, slug }: { id: string; slug: string }) {
  const [state, action] = useActionState(addJourneyEntry, initial);
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  // Ngày local (VN); SSR có thể ra ngày UTC khác trong 00:00–07:00 -> suppressHydrationWarning ở input.
  const [entryDate, setEntryDate] = useState(() => localToday());
  const fileRef = useRef<HTMLInputElement>(null);
  const pickedRef = useRef<typeof picked>(null);

  useEffect(() => { pickedRef.current = picked; });
  useEffect(
    () => () => { if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.url); },
    [],
  );

  const busy = pending || uploading;
  const error = localError ?? state.error;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicked((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
    e.target.value = "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const form = e.currentTarget;
    if (!picked) return setLocalError("Thêm một tấm ảnh nhé.");

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLocalError("Bạn cần đăng nhập đã nhé.");

      let r;
      try { r = await resizeImage(picked.file); }
      catch { return setLocalError("Ảnh chưa xử lý được, thử ảnh khác nhé."); }

      const path = `${user.id}/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, r.blob, { contentType: "image/webp", upsert: false });
      if (upErr) return setLocalError("Chưa tải được ảnh lên, thử lại nhé.");

      const note = (
        form.elements.namedItem("entryNote") as HTMLInputElement | null
      )?.value.trim() ?? "";
      const fd = new FormData();
      fd.set("id", id);
      fd.set("slug", slug);
      fd.set("media", JSON.stringify([
        { path, w: r.width, h: r.height, blurDataURL: r.blurDataURL },
      ]));
      fd.set("note", note);
      fd.set("date", entryDate || localToday());
      startTransition(() => action(fd));
    } catch {
      setLocalError("Có lỗi khi tải ảnh, thử lại nhé.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {picked ? (
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview blob tạm */}
          <img src={picked.url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(picked.url);
              setPicked(null);
            }}
            aria-label="Bỏ ảnh"
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-text shadow-soft transition-colors hover:text-accent-text"
          >×</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex aspect-4/3 w-full items-center justify-center rounded-lg border border-dashed border-border text-text-muted transition-colors hover:border-accent hover:text-text"
        >+ Ảnh của chặng này</button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Input
          type="date"
          name="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          suppressHydrationWarning
          aria-label="Ngày của chặng"
        />
        <Input
          type="text"
          name="entryNote"
          maxLength={500}
          placeholder="Ghi chú chặng này (tuỳ chọn)"
          className="flex-1"
        />
      </div>

      {error && <FormError>{error}</FormError>}

      <div className="flex items-center gap-4">
        <Button type="submit" loading={busy} loadingLabel="Đang lưu…">
          Thêm chặng
        </Button>
        <a href={`/m/${slug}`} className="text-sm text-text-muted hover:text-text">
          Huỷ
        </a>
      </div>
    </form>
  );
}
