"use client";

import Image from "next/image";
import { useActionState, useRef, useState, useTransition } from "react";
import { resizeImage } from "@/features/compose/resize-image";
import { createClient } from "@/lib/supabase/client";
import { photoPublicUrl } from "@/lib/storage";
import type { Album, Photo } from "@/lib/db/albums";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { readExif, exifLine } from "./exif";
import {
  saveAlbum,
  publishAlbumAction,
  deleteAlbumAction,
  addPhotoAction,
  removePhotoAction,
  reorderPhotosAction,
  type AlbumState,
} from "./actions";

const initial: AlbumState = { error: null };
const MAX_PHOTOS = 60; // khớp actions.ts (server vẫn là nơi chốt)

/**
 * Form album ở /me/anh/[id]. Album đã là row DB (nháp) nên mỗi ảnh xử lý xong
 * là một insert — hỏng giữa chừng mở lại vẫn còn.
 * Upload TUẦN TỰ: 30 canvas 2048px cùng lúc treo trình duyệt. Tiến độ = thanh tĩnh.
 * Đổi thứ tự: HTML5 drag-and-drop thuần + nút ‹ › cho mobile; ghi bằng RPC một câu.
 */
export function AlbumForm({ album }: { album: Album }) {
  const [saveState, saveAction] = useActionState(saveAlbum, initial);
  const [publishState, publishAction] = useActionState(publishAlbumAction, initial);
  const [pending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<Photo[]>(album.photos);
  const [cover, setCover] = useState<string>(album.coverPhotoId ?? "");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = pending || progress !== null;
  const error = localError ?? saveState.error ?? publishState.error;

  /** Mỗi ảnh: EXIF -> resize -> upload -> addPhotoAction. Thứ tự EXIF trước resize là BẮT BUỘC. */
  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setLocalError(null);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return setLocalError(`Album đã đủ ${MAX_PHOTOS} ảnh.`);
    // Mặc định xếp theo lúc CHỤP: lastModified là proxy rẻ (không đọc EXIF hai lần);
    // tác giả đổi tay được sau.
    const batch = files.slice(0, room).sort((a, b) => a.lastModified - b.lastModified);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setLocalError("Bạn cần đăng nhập đã nhé.");

    setProgress({ done: 0, total: batch.length });
    try {
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        const exif = await readExif(file); // TRƯỚC resize: canvas xoá metadata
        let r;
        try {
          r = await resizeImage(file);
        } catch {
          setLocalError(`Ảnh "${file.name}" chưa xử lý được, bỏ qua.`);
          continue;
        }
        const path = `${user.id}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage.from("photos").upload(path, r.blob, {
          contentType: "image/webp",
          upsert: false,
          cacheControl: "31536000", // ảnh immutable (path uuid) -> cache 1 năm
        });
        if (upErr) {
          setLocalError(`Chưa tải được "${file.name}", thử lại nhé.`);
          break;
        }
        const fd = new FormData();
        fd.set("albumId", album.id);
        fd.set("path", path);
        fd.set("w", String(r.width));
        fd.set("h", String(r.height));
        fd.set("blurDataURL", r.blurDataURL);
        if (exif.camera) fd.set("camera", exif.camera);
        if (exif.lens) fd.set("lens", exif.lens);
        if (exif.focalLength !== null) fd.set("focalLength", String(exif.focalLength));
        if (exif.aperture !== null) fd.set("aperture", String(exif.aperture));
        if (exif.shutter) fd.set("shutter", exif.shutter);
        if (exif.iso !== null) fd.set("iso", String(exif.iso));
        if (exif.takenAt) fd.set("takenAt", exif.takenAt);
        const res = await addPhotoAction(fd);
        if (!res.ok) {
          setLocalError(res.error);
          break;
        }
        setPhotos((ps) => [...ps, res.photo]);
        setProgress({ done: i + 1, total: batch.length });
      }
    } finally {
      setProgress(null);
    }
  }

  async function remove(photo: Photo) {
    if (!window.confirm("Bỏ ảnh này khỏi album? Ảnh sẽ bị xoá khỏi kho.")) return;
    const fd = new FormData();
    fd.set("albumId", album.id);
    fd.set("photoId", photo.id);
    const res = await removePhotoAction(fd);
    if (res.error) return setLocalError(res.error);
    setPhotos((ps) => ps.filter((p) => p.id !== photo.id));
    if (cover === photo.id) setCover("");
  }

  /** Ghi thứ tự mới: optimistic trong state, RPC ở server; lỗi thì rollback. */
  async function commitOrder(next: Photo[]) {
    const prev = photos;
    setPhotos(next);
    const fd = new FormData();
    fd.set("albumId", album.id);
    fd.set("ids", JSON.stringify(next.map((p) => p.id)));
    const res = await reorderPhotosAction(fd);
    if (res.error) {
      setPhotos(prev);
      setLocalError(res.error);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void commitOrder(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", album.id);
    fd.set("coverPhotoId", cover);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const act = submitter?.value === "publish" ? publishAction : saveAction;
    startTransition(() => act(fd));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Field label="Tên album">
        <Input name="title" defaultValue={album.title} maxLength={120} placeholder="vd: Sập Sài" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Địa điểm" hint="Chữ thuần, không toạ độ.">
          <Input name="place" defaultValue={album.place ?? ""} maxLength={120} placeholder="vd: Hà Giang" />
        </Field>
        <Field label="Ngày chụp">
          <Input type="date" name="shotOn" defaultValue={album.shotOn ?? ""} />
        </Field>
      </div>
      <Field label="Mô tả">
        <Textarea name="description" rows={4} defaultValue={album.description ?? ""} maxLength={2000} />
      </Field>

      {/* Ảnh */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Ảnh <span className="tabular-nums">({photos.length}/{MAX_PHOTOS})</span>
          </p>
          <Button
            type="button"
            variant="quiet"
            size="sm"
            disabled={busy || photos.length >= MAX_PHOTOS}
            onClick={() => fileRef.current?.click()}
          >
            + Chọn ảnh
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            className="hidden"
          />
        </div>

        {/* Tiến độ: thanh TĨNH (không spinner). */}
        {progress && (
          <div aria-live="polite" className="flex flex-col gap-1">
            <p className="text-xs text-text-muted tabular-nums">
              Đang xử lý {progress.done}/{progress.total}…
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => {
            const line = exifLine(p);
            return (
              <li
                key={p.id}
                draggable={!busy}
                onDragStart={(e) => {
                  // Firefox không bắt đầu kéo nếu dataTransfer trống.
                  e.dataTransfer.setData("text/plain", String(i));
                  e.dataTransfer.effectAllowed = "move";
                  setDragFrom(i);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragFrom !== null) move(dragFrom, i);
                  setDragFrom(null);
                }}
                onDragEnd={() => setDragFrom(null)}
                className={`flex flex-col gap-1 rounded-md border bg-surface p-1.5 ${
                  dragFrom === i ? "border-accent" : "border-border"
                }`}
              >
                <div className="relative aspect-square overflow-hidden rounded-sm bg-border/40">
                  <Image
                    src={photoPublicUrl(p.path)}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 30vw, 190px"
                    placeholder={p.blurDataURL ? "blur" : "empty"}
                    blurDataURL={p.blurDataURL ?? undefined}
                    className="object-cover"
                  />
                  {cover === p.id && (
                    <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-on-accent">
                      bìa
                    </span>
                  )}
                </div>
                {line && <p className="truncate text-[10px] text-text-muted">{line}</p>}
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span className="flex gap-1">
                    <button type="button" onClick={() => move(i, i - 1)} disabled={busy || i === 0} aria-label={`Ảnh ${i + 1}: lên trước`} className="px-1 hover:text-text disabled:opacity-40">‹</button>
                    <button type="button" onClick={() => move(i, i + 1)} disabled={busy || i === photos.length - 1} aria-label={`Ảnh ${i + 1}: xuống sau`} className="px-1 hover:text-text disabled:opacity-40">›</button>
                  </span>
                  <span className="flex gap-2">
                    <button type="button" onClick={() => setCover(cover === p.id ? "" : p.id)} disabled={busy} className="hover:text-text disabled:opacity-40">
                      {cover === p.id ? "bỏ bìa" : "làm bìa"}
                    </button>
                    <button type="button" onClick={() => remove(p)} disabled={busy} aria-label={`Bỏ ảnh ${i + 1}`} className="hover:text-error disabled:opacity-40">×</button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        {photos.length > 0 && (
          <p className="text-xs text-text-muted">
            Kéo-thả hoặc dùng ‹ › để đổi thứ tự · mặc định theo lúc chụp.
          </p>
        )}
      </div>

      {error && <FormError>{error}</FormError>}
      {saveState.ok && !error && (
        <p role="status" className="text-sm text-text-muted">Đã lưu.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" name="intent" value="save" variant="secondary" loading={pending} loadingLabel="Đang lưu…">
          {album.isPublished ? "Lưu thay đổi" : "Lưu nháp"}
        </Button>
        {!album.isPublished && (
          <Button type="submit" name="intent" value="publish" loading={pending} loadingLabel="Đang đăng…">
            Đăng
          </Button>
        )}
        {album.isPublished && (
          <a href={`/anh/${album.slug}`} className="text-sm text-text-muted hover:text-text">
            Xem album
          </a>
        )}
      </div>
    </form>
  );
}

/** Nút xoá album — form riêng để không lồng form trong form. */
export function DeleteAlbumButton({ id, title }: { id: string; title: string }) {
  return (
    <form action={deleteAlbumAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="danger"
        size="sm"
        aria-label={`Xoá album: ${title || "chưa đặt tên"}`}
        onClick={(e) => {
          if (!window.confirm("Xoá album này và mọi ảnh trong đó? Không hoàn tác được nhé."))
            e.preventDefault();
        }}
      >
        Xoá album
      </Button>
    </form>
  );
}
