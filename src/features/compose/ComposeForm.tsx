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
  saveDraft,
  updateDraft,
  publishDraft,
  type ComposeState,
} from "./actions";
import { resizeImage } from "./resize-image";
import { MOOD_CODES, type MoodCode } from "@/lib/moods";
import type { MediaItem, PostType as DbPostType } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/client";
import { mediaPublicUrl } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { MoodChip } from "@/components/ui/Chip";
import { FormError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

const MAX_IMAGES = 10;

const initial: ComposeState = { error: null };
type PostType = "khoanh_khac" | "goc_doc" | "hanh_trinh";
type MomentKind = "image" | "video"; // Khoảnh khắc: ảnh hoặc video Vimeo

export interface DraftInit {
  id: string;
  type: DbPostType;
  mood: MoodCode;
  caption: string;
  excerpt: string;
  linkUrl: string;
  media: MediaItem[];
  /** Hành trình: ngày + ghi chú của chặng đầu (nháp chỉ có một chặng). */
  date?: string;
  note?: string;
}

// YYYY-MM-DD theo giờ máy người dùng (giờ VN) — cho ô ngày của Hành trình.
function localToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * Một ô ảnh trong form. Hai dạng dùng CHUNG mọi thao tác (xoá, nhập alt, thứ tự):
 * - "existing": đã nằm trên Storage (mở lại nháp) — có `path`, không có `File`.
 * - "new": vừa chọn từ máy, chưa resize/upload — có `File` + blob URL.
 */
type Slot =
  | { kind: "existing"; item: MediaItem; alt: string }
  | { kind: "new"; file: File; url: string; alt: string };

/** Ảnh để xem trước: ảnh cũ lấy URL công khai, ảnh mới lấy blob URL. */
function slotPreview(s: Slot): string {
  return s.kind === "existing" ? mediaPublicUrl(s.item.path!) : s.url;
}

/** Khoá React ổn định cho từng ô. */
function slotKey(s: Slot): string {
  return s.kind === "existing" ? `e:${s.item.path}` : `n:${s.url}`;
}

const MAX_ALT = 200; // khớp mức cắt ở actions.ts (server vẫn là nơi chốt)

/**
 * Ô mô tả ảnh (alt) — một hàng mỗi ảnh: ảnh nhỏ + ô nhập RỘNG.
 * Không nhét vào lưới 3 cột: ô nhập ~100px trên mobile thì không gõ nổi.
 */
function AltFields({
  slots,
  onChange,
}: {
  slots: Slot[];
  onChange: (index: number, alt: string) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted">
        Mô tả ảnh (tuỳ chọn) — cho người dùng trình đọc màn hình.
      </p>
      {slots.map((s, i) => (
        <div key={slotKey(s)} className="flex items-center gap-2">
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview (blob hoac URL Storage) */}
            <img
              src={slotPreview(s)}
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
          <Input
            type="text"
            value={s.alt}
            maxLength={MAX_ALT}
            onChange={(e) => onChange(i, e.target.value)}
            aria-label={`Mô tả ảnh ${i + 1}`}
            placeholder={
              slots.length > 1 ? `Trong ảnh ${i + 1} có gì?` : "Trong ảnh có gì?"
            }
            className="flex-1"
          />
        </div>
      ))}
    </div>
  );
}

export function ComposeForm({ draft }: { draft?: DraftInit } = {}) {
  const [type, setType] = useState<PostType>(draft?.type ?? "khoanh_khac");
  const [momentKind, setMomentKind] = useState<MomentKind>("image");
  const [imagesState, imagesAction] = useActionState(createMomentImages, initial);
  const [videoState, videoAction] = useActionState(createMomentVideo, initial);
  const [gocDocState, gocDocAction] = useActionState(createGocDoc, initial);
  const [journeyState, journeyAction] = useActionState(createJourney, initial);
  const [draftState, draftAction] = useActionState(saveDraft, initial);
  const [updateState, updateAction] = useActionState(updateDraft, initial);
  const [publishState, publishAction] = useActionState(publishDraft, initial);
  // Ngày local (VN); SSR có thể ra ngày UTC khác trong 00:00–07:00 -> suppressHydrationWarning ở input.
  const [entryDate, setEntryDate] = useState(() => draft?.date ?? localToday());
  const [pending, startTransition] = useTransition();
  const [mood, setMood] = useState<MoodCode | "">(draft?.mood ?? "");
  const [slots, setSlots] = useState<Slot[]>(() =>
    (draft?.media ?? [])
      .filter((m) => !!m.path)
      .map((item) => ({ kind: "existing" as const, item, alt: item.alt ?? "" })),
  );
  const slotsRef = useRef<Slot[]>(slots);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Giữ ref đồng bộ để cleanup effect đọc bản mới nhất (tránh stale closure).
  useEffect(() => {
    slotsRef.current = slots;
  });

  const busy = pending || uploading;
  const error =
    localError ??
    imagesState.error ??
    videoState.error ??
    gocDocState.error ??
    journeyState.error ??
    draftState.error ??
    updateState.error ??
    publishState.error;

  // Thu hồi blob URL khi unmount — CHỈ ô "new" mới có blob.
  useEffect(
    () => () => {
      slotsRef.current.forEach((s) => {
        if (s.kind === "new") URL.revokeObjectURL(s.url);
      });
    },
    [],
  );

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setSlots((prev) => {
      const room = MAX_IMAGES - prev.length;
      const add = files.slice(0, Math.max(0, room)).map(
        (file) =>
          ({
            kind: "new" as const,
            file,
            url: URL.createObjectURL(file),
            alt: "",
          }),
      );
      return [...prev, ...add];
    });
    e.target.value = ""; // cho chọn lại cùng file
  }

  function setAlt(i: number, alt: string) {
    setSlots((prev) => prev.map((s, k) => (k === i ? { ...s, alt } : s)));
  }

  function removeImage(i: number) {
    setSlots((prev) => {
      const s = prev[i];
      if (s?.kind === "new") URL.revokeObjectURL(s.url);
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

  /**
   * Dựng mảng media CUỐI CÙNG theo đúng thứ tự đang hiện trên form:
   * ô "existing" đi qua nguyên vẹn (chỉ cập nhật alt), ô "new" mới resize+upload.
   * Trả null nếu lỗi (đã setLocalError).
   */
  async function uploadSlots(list: Slot[]): Promise<MediaItem[] | null> {
    if (list.length === 0) return [];
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLocalError("Bạn cần đăng nhập đã nhé.");
        return null;
      }
      const media: MediaItem[] = [];
      for (const s of list) {
        if (s.kind === "existing") {
          media.push({ ...s.item, alt: s.alt.trim() || undefined });
          continue;
        }
        let r;
        try {
          r = await resizeImage(s.file);
        } catch {
          setLocalError("Một tấm ảnh chưa xử lý được, thử ảnh khác nhé.");
          return null;
        }
        const path = `${user.id}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, r.blob, {
            contentType: "image/webp",
            upsert: false,
            // Path là uuid, không bao giờ ghi đè -> ảnh immutable, cache 1 năm.
            // Vercel lấy max(max-age upstream, minimumCacheTTL) làm TTL ảnh tối ưu;
            // mặc định Supabase 3600s khiến mỗi 4h xem lại tốn thêm 1 transform.
            cacheControl: "31536000",
          });
        if (upErr) {
          setLocalError("Chưa tải được ảnh lên, thử lại nhé.");
          return null;
        }
        media.push({
          path,
          w: r.width,
          h: r.height,
          blurDataURL: r.blurDataURL,
          alt: s.alt.trim() || undefined,
        });
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

    // Nút nào vừa bấm: "Lưu nháp" hay "Đăng".
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;

    if (draft) {
      const media = await uploadSlots(slots);
      if (media === null) return;
      // Upload xong -> ảnh ĐÃ nằm trên Storage, nên hạ mọi ô về "existing" NGAY
      // (form không redirect, nó còn đó sau khi lưu). Lần "Lưu thay đổi" sau
      // chúng đi qua nguyên vẹn: không resize+upload lại thành path mới rồi để
      // server dọn path cũ — đốt quota Storage cho đúng bấy nhiêu bytes.
      // Đúng cả khi lưu hụt: ảnh vẫn trên Storage, `keep` của server vẫn chứa
      // path đó nên lần lưu lại `removedPaths` ra rỗng.
      slots.forEach((s) => {
        if (s.kind === "new") URL.revokeObjectURL(s.url);
      });
      setSlots(media.map((item) => ({ kind: "existing" as const, item, alt: item.alt ?? "" })));
      const fd = new FormData();
      fd.set("id", draft.id);
      fd.set("mood", mood);
      fd.set("caption", caption);
      fd.set("media", JSON.stringify(media));
      if (type === "goc_doc") {
        fd.set("linkUrl", fieldValue(form, "linkUrl"));
        fd.set("excerpt", fieldValue(form, "excerpt"));
      }
      if (type === "hanh_trinh") {
        fd.set("note", fieldValue(form, "entryNote"));
        fd.set("date", entryDate || localToday());
      }
      const act = submitter?.value === "draft" ? updateAction : publishAction;
      startTransition(() => act(fd));
      return;
    }

    if (submitter?.value === "draft") {
      // Nháp: ảnh là TUỲ CHỌN (chưa có ảnh vẫn lưu được).
      const media = await uploadSlots(slots);
      if (media === null) return; // uploadSlots đã setLocalError
      const fd = new FormData();
      fd.set("type", type);
      fd.set("mood", mood);
      fd.set("caption", caption);
      fd.set("media", JSON.stringify(media));
      if (type === "goc_doc") {
        fd.set("linkUrl", fieldValue(form, "linkUrl"));
        fd.set("excerpt", fieldValue(form, "excerpt"));
      }
      if (type === "hanh_trinh") {
        fd.set("note", fieldValue(form, "entryNote"));
        fd.set("date", entryDate || localToday());
      }
      startTransition(() => draftAction(fd));
      return;
    }

    if (type === "khoanh_khac" && momentKind === "video") {
      const videoUrl = fieldValue(form, "videoUrl");
      if (!videoUrl) return setLocalError("Dán link video Vimeo nhé.");
      const fd = new FormData();
      fd.set("caption", caption);
      fd.set("mood", mood);
      fd.set("videoUrl", videoUrl);
      startTransition(() => videoAction(fd));
    } else if (type === "khoanh_khac") {
      if (slots.length === 0) return setLocalError("Thêm ít nhất một tấm ảnh nhé.");
      const media = await uploadSlots(slots);
      if (!media) return;
      const fd = new FormData();
      fd.set("caption", caption);
      fd.set("mood", mood);
      fd.set("media", JSON.stringify(media));
      startTransition(() => imagesAction(fd));
    } else if (type === "hanh_trinh") {
      if (slots.length === 0)
        return setLocalError("Thêm một tấm ảnh cho chặng đầu tiên nhé.");
      if (slots.length > 1)
        return setLocalError("Hành trình mỗi chặng chỉ một ảnh — bỏ bớt nhé.");
      const media = await uploadSlots(slots);
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
      {!draft && (
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
      )}

      {type === "khoanh_khac" ? (
        <div className="flex flex-col gap-4">
          {/* Ảnh hay video — nháp chỉ có ảnh, chọn Video ở đây không có tác dụng gì. */}
          {!draft && (
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
          )}

          {momentKind === "image" ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s, i) => (
                  <div
                    key={slotKey(s)}
                    className="relative aspect-square overflow-hidden rounded-md border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview (blob hoac URL Storage) */}
                    <img
                      src={slotPreview(s)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={`Bỏ ảnh ${i + 1}`}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-surface/90 text-text shadow-soft transition-colors hover:text-accent-text"
                    >×</button>
                  </div>
                ))}
                {slots.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
                  >+ Ảnh</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />
              <p className="text-xs text-text-muted">Tối đa {MAX_IMAGES} ảnh · vuốt để xem trong feed.</p>
              <AltFields slots={slots} onChange={setAlt} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                type="url"
                name="videoUrl"
                placeholder="Dán link Vimeo (vd vimeo.com/123456789)"
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
              {slots.map((s, i) => (
                <div
                  key={slotKey(s)}
                  className="relative aspect-square overflow-hidden rounded-md border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- preview (blob hoac URL Storage) */}
                  <img
                    src={slotPreview(s)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Bỏ ảnh ${i + 1}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-surface/90 text-text shadow-soft transition-colors hover:text-accent-text"
                  >×</button>
                </div>
              ))}
              {slots.length < 1 && (
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
            <AltFields slots={slots} onChange={setAlt} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Input
              type="date"
              name="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              suppressHydrationWarning
              aria-label="Ngày của chặng đầu tiên"
            />
            <Input
              type="text"
              name="entryNote"
              maxLength={500}
              defaultValue={draft?.note ?? ""}
              placeholder="Ghi chú chặng này (tuỳ chọn)"
              className="flex-1"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Input
            type="url"
            name="linkUrl"
            defaultValue={draft?.linkUrl ?? ""}
            placeholder="Dán link (tuỳ chọn)"
          />
          <Textarea
            name="excerpt"
            rows={3}
            defaultValue={draft?.excerpt ?? ""}
            placeholder="Một đoạn bạn tâm đắc…"
            className="italic"
            style={{ fontFamily: "var(--font-serif)" }}
          />
        </div>
      )}

      {/* Caption / cảm nhận */}
      <Textarea
        name="caption"
        rows={3}
        defaultValue={draft?.caption ?? ""}
        placeholder={
          type === "khoanh_khac"
            ? "Hôm nay bạn thấy thế nào?"
            : type === "hanh_trinh"
              ? "Hành trình này là gì? (vd: Tập gym)"
              : "Vì sao bạn thích điều này?"
        }
        style={{ fontFamily: "var(--font-serif)" }}
      />

      {/* Tâm trạng */}
      <div>
        <p className="mb-2 text-sm text-text-muted">Tâm trạng</p>
        <div className="flex flex-wrap gap-2">
          {MOOD_CODES.map((code) => (
            <MoodChip
              key={code}
              code={code}
              selected={mood === code}
              onClick={() => setMood(code)}
            />
          ))}
        </div>
      </div>

      {error && <FormError>{error}</FormError>}
      {/* "Lưu thay đổi" không chuyển trang (khác "Đăng") — không báo gì thì trang
      trông y như chưa bấm, dễ khiến bấm lại. Chỉ một dòng chữ tĩnh, không toast. */}
      {!error && updateState.ok && (
        <p className="text-sm text-text-muted">Đã lưu.</p>
      )}

      {/* Các nút hành động */}
      {(() => {
        const publishButton = (
          <Button type="submit" value="publish" loading={busy} loadingLabel="Đang lưu…">
            Đăng
          </Button>
        );
        const saveButton = !(type === "khoanh_khac" && momentKind === "video") && (
          <Button
            type="submit"
            value="draft"
            variant="secondary"
            disabled={busy}
          >
            {draft ? "Lưu thay đổi" : "Lưu nháp"}
          </Button>
        );
        return (
          <div className="flex items-center gap-3">
            {draft ? (
              <>
                {/* Khi sửa nháp: Enter trong ô một-dòng submit vào nút đầu tiên.
                Nút đầu phải là nút an toàn (lưu), chứ không phải đăng liền
                rồi mất hành trang lùi. */}
                {saveButton}
                {publishButton}
              </>
            ) : (
              <>
                {publishButton}
                {saveButton}
              </>
            )}
          </div>
        );
      })()}
    </form>
  );
}
