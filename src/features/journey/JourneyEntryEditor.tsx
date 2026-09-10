"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { updateJourneyEntry, type ComposeState } from "@/features/compose/actions";
import { resizeImage } from "@/features/compose/resize-image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export interface JourneyEntryItem {
  path: string;
  url: string; // public URL (server tính sẵn)
  date?: string;
  note?: string;
}

const initial: ComposeState = { error: null };

// Sửa MỘT chặng ngay trong danh sách (trang Sửa bài): đổi ảnh + ngày + ghi chú.
// Ảnh upload client-side lên Storage (như AddEntryForm) — action chỉ thay media tại chỗ.
export function JourneyEntryEditor({
  postId,
  slug,
  ordinal,
  entry,
  onDone,
  onCancel,
}: {
  postId: string;
  slug: string;
  ordinal: number;
  entry: JourneyEntryItem;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action] = useActionState(updateJourneyEntry, initial);
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [date, setDate] = useState(entry.date ?? "");
  const [note, setNote] = useState(entry.note ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const pickedRef = useRef<typeof picked>(null);

  useEffect(() => { pickedRef.current = picked; });
  useEffect(
    () => () => { if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.url); },
    [],
  );

  // Lưu xong -> đóng form, danh sách đã tươi (server action tự re-render route).
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  const busy = pending || uploading;
  const error = localError ?? state.error;

  function clearPicked() {
    setPicked((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }

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

    const fd = new FormData();
    fd.set("id", postId);
    fd.set("slug", slug);
    fd.set("path", entry.path);
    fd.set("date", date || entry.date || "");
    fd.set("note", note.trim());

    // Không chọn ảnh mới -> giữ ảnh cũ (media rỗng).
    if (picked) {
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

        fd.set("media", JSON.stringify([
          { path, w: r.width, h: r.height, blurDataURL: r.blurDataURL },
        ]));
      } catch {
        return setLocalError("Có lỗi khi tải ảnh, thử lại nhé.");
      } finally {
        setUploading(false);
      }
    }

    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={`Đổi ảnh chặng ${ordinal}`}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-border bg-border/40 transition-colors hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {picked ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview blob tạm
            <img src={picked.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Image
              src={entry.url}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
          <span className="absolute inset-x-0 bottom-0 bg-surface/85 py-0.5 text-center text-[10px] text-text-muted">
            Đổi ảnh
          </span>
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label={`Ngày chặng ${ordinal}`}
            size="sm"
          />
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Ghi chú chặng này (tuỳ chọn)"
            aria-label={`Ghi chú chặng ${ordinal}`}
            size="sm"
          />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onPickFile}
        className="hidden"
      />

      {picked && (
        <p className="text-xs text-text-muted">
          Đã chọn ảnh mới — ảnh cũ sẽ bị xoá khi lưu.{" "}
          <button
            type="button"
            onClick={clearPicked}
            className="underline underline-offset-2 transition-colors hover:text-text"
          >
            Giữ ảnh cũ
          </button>
        </p>
      )}

      {error && <FormError>{error}</FormError>}

      <div className="flex items-center gap-4">
        <Button type="submit" size="sm" loading={busy} loadingLabel="Đang lưu…">
          Lưu chặng
        </Button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="text-[13px] text-text-muted transition-colors hover:text-text disabled:opacity-60"
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}
