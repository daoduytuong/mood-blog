"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createAlbum,
  getAlbumByIdForAuthor,
  updateAlbum,
  publishAlbum,
  deleteAlbum,
  insertPhoto,
  deletePhoto,
  reorderPhotos,
  listPhotoPaths,
  type Photo,
} from "@/lib/db/albums";
import { uniqueAlbumSlug } from "./slug";

export interface AlbumState {
  error: string | null;
  ok?: boolean;
}

const MAX_PHOTOS = 60;
const MAX_TITLE = 120;
const MAX_PLACE = 120;
const MAX_DESC = 2000;
const MAX_ALT = 200;

/** Mọi trang công khai chứa album: /anh, /anh/<slug>, dải "Ảnh mới" trên /. */
function revalidateAlbum(slug: string) {
  revalidatePath("/anh");
  revalidatePath(`/anh/${slug}`);
  revalidatePath("/");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Bấm "Album mới": tạo row nháp NGAY (photos cần album_id) rồi vào form sửa. */
export async function createDraftAlbum(): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?returnTo=/me/anh");
  const slug = await uniqueAlbumSlug(supabase, "", "nhap-anh");
  let id: string;
  try {
    id = await createAlbum(supabase, { authorId: user.id, slug });
  } catch {
    redirect("/me/anh");
  }
  redirect(`/me/anh/${id}`);
}

/** Lưu chữ + bìa của album (nháp hoặc đã đăng — đã đăng chỉ đổi chữ, không đổi slug). */
export async function saveAlbum(_prev: AlbumState, formData: FormData): Promise<AlbumState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu thông tin album, thử lại nhé." };
  const existing = await getAlbumByIdForAuthor(supabase, id);
  if (!existing || existing.authorId !== user.id) return { error: "Không tìm thấy album." };

  const title = String(formData.get("title") ?? "").trim().slice(0, MAX_TITLE);
  const place = String(formData.get("place") ?? "").trim().slice(0, MAX_PLACE);
  const description = String(formData.get("description") ?? "").trim().slice(0, MAX_DESC);
  const shotOnRaw = String(formData.get("shotOn") ?? "");
  const shotOn = /^\d{4}-\d{2}-\d{2}$/.test(shotOnRaw) ? shotOnRaw : null;
  const coverRaw = String(formData.get("coverPhotoId") ?? "");
  const coverPhotoId = existing.photos.some((p) => p.id === coverRaw) ? coverRaw : null;

  try {
    await updateAlbum(supabase, id, {
      title,
      place: place || null,
      description: description || null,
      shotOn,
      coverPhotoId,
    });
  } catch {
    return { error: "Chưa lưu được, thử lại nhé." };
  }
  if (existing.isPublished) revalidateAlbum(existing.slug);
  return { error: null, ok: true };
}

/** Đăng nháp: lưu chữ trước, rồi sinh slug thật từ title và bật is_published. */
export async function publishAlbumAction(prev: AlbumState, formData: FormData): Promise<AlbumState> {
  const saved = await saveAlbum(prev, formData);
  if (saved.error) return saved;

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };
  const id = String(formData.get("id") ?? "");
  const existing = await getAlbumByIdForAuthor(supabase, id);
  if (!existing || existing.authorId !== user.id) return { error: "Không tìm thấy album." };
  if (existing.isPublished) return { error: "Album này đã đăng rồi." };
  if (!existing.title) return { error: "Đặt tên cho album trước khi đăng nhé." };
  if (existing.photos.length === 0) return { error: "Thêm ít nhất một tấm ảnh trước khi đăng nhé." };

  const slug = await uniqueAlbumSlug(supabase, existing.title, "album");
  try {
    await publishAlbum(supabase, existing.id, slug);
  } catch {
    return { error: "Chưa đăng được, thử lại nhé." };
  }
  revalidateAlbum(slug);
  redirect(`/anh/${slug}`);
}

/** Xoá album: xoá row trước (photos/hearts/comments cascade), dọn Storage sau (best-effort). */
export async function deleteAlbumAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const existing = id ? await getAlbumByIdForAuthor(supabase, id) : null;
  if (!existing || existing.authorId !== user.id) redirect("/me/anh");

  const paths = await listPhotoPaths(supabase, id); // đọc TRƯỚC khi xoá row (cascade sẽ xoá photos)
  try {
    await deleteAlbum(supabase, id);
  } catch {
    redirect(`/me/anh/${id}`);
  }
  // DB đã gọn -> dọn Storage best-effort (hụt thì thành rác, không mất dữ liệu).
  if (paths.length) await supabase.storage.from("photos").remove(paths);
  if (existing.isPublished) revalidateAlbum(existing.slug);
  redirect("/me/anh");
}

/**
 * Thêm MỘT ảnh đã upload (client resize + upload trước, như uploadSlots của ComposeForm).
 * Gọi từng ảnh để nháp lớn dần — hỏng ở ảnh 12/30 thì 11 ảnh đã nằm trong DB.
 * Trả kết quả thay vì redirect: form còn đang chạy vòng upload.
 */
export async function addPhotoAction(
  formData: FormData,
): Promise<{ ok: true; photo: Photo } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập đã nhé." };

  const albumId = String(formData.get("albumId") ?? "");
  const path = String(formData.get("path") ?? "");
  const cleanup = async () => {
    if (path.startsWith(`${user.id}/`)) await supabase.storage.from("photos").remove([path]);
  };

  const existing = albumId ? await getAlbumByIdForAuthor(supabase, albumId) : null;
  if (!existing || existing.authorId !== user.id) {
    await cleanup();
    return { ok: false, error: "Không tìm thấy album." };
  }
  if (!path.startsWith(`${user.id}/`) || !path.endsWith(".webp")) {
    await cleanup();
    return { ok: false, error: "Đường dẫn ảnh không hợp lệ." };
  }
  if (existing.photos.length >= MAX_PHOTOS) {
    await cleanup();
    return { ok: false, error: `Album đã đủ ${MAX_PHOTOS} ảnh — mở album mới nhé.` };
  }

  const n = (v: FormDataEntryValue | null) => {
    const x = Number(v);
    return v === null || v === "" || !Number.isFinite(x) ? null : x;
  };
  const s = (v: FormDataEntryValue | null, max: number) => {
    const t = String(v ?? "").trim().slice(0, max);
    return t || null;
  };
  const blur = String(formData.get("blurDataURL") ?? "");
  const takenRaw = String(formData.get("takenAt") ?? "");
  const takenAt = takenRaw && !Number.isNaN(Date.parse(takenRaw)) ? takenRaw : null;

  try {
    const photo = await insertPhoto(supabase, {
      albumId,
      path,
      w: n(formData.get("w")),
      h: n(formData.get("h")),
      blurDataURL: blur.startsWith("data:image/") && blur.length < 4000 ? blur : null,
      position: existing.photos.length + 1,
      alt: s(formData.get("alt"), MAX_ALT),
      camera: s(formData.get("camera"), 80),
      lens: s(formData.get("lens"), 80),
      focalLength: n(formData.get("focalLength")),
      aperture: n(formData.get("aperture")),
      shutter: s(formData.get("shutter"), 16),
      iso: n(formData.get("iso")),
      takenAt,
    });
    if (existing.isPublished) revalidateAlbum(existing.slug);
    return { ok: true, photo };
  } catch {
    await cleanup();
    return { ok: false, error: "Chưa lưu được ảnh, thử lại nhé." };
  }
}

/** Bỏ một ảnh: xoá row trước, dọn Storage sau (best-effort). */
export async function removePhotoAction(formData: FormData): Promise<AlbumState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };
  const albumId = String(formData.get("albumId") ?? "");
  const photoId = String(formData.get("photoId") ?? "");
  const existing = albumId ? await getAlbumByIdForAuthor(supabase, albumId) : null;
  if (!existing || existing.authorId !== user.id) return { error: "Không tìm thấy album." };
  const photo = existing.photos.find((p) => p.id === photoId);
  if (!photo) return { error: "Không tìm thấy ảnh này." };
  try {
    await deletePhoto(supabase, photoId);
  } catch {
    return { error: "Chưa bỏ được ảnh, thử lại nhé." };
  }
  await supabase.storage.from("photos").remove([photo.path]);
  if (existing.isPublished) revalidateAlbum(existing.slug);
  return { error: null, ok: true };
}

/** Đổi thứ tự: `ids` = JSON mảng id theo thứ tự mới, phải là hoán vị của ảnh trong album. */
export async function reorderPhotosAction(formData: FormData): Promise<AlbumState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };
  const albumId = String(formData.get("albumId") ?? "");
  let ids: string[] = [];
  try {
    const raw = JSON.parse(String(formData.get("ids") ?? "[]"));
    if (Array.isArray(raw)) ids = raw.filter((x): x is string => typeof x === "string");
  } catch {
    return { error: "Thứ tự không hợp lệ." };
  }
  const existing = albumId ? await getAlbumByIdForAuthor(supabase, albumId) : null;
  if (!existing || existing.authorId !== user.id) return { error: "Không tìm thấy album." };
  const have = new Set(existing.photos.map((p) => p.id));
  const unique = new Set(ids);
  // Hoán vị THẬT: đủ số, không trùng, mọi id đều thuộc album.
  if (
    ids.length !== have.size ||
    unique.size !== ids.length ||
    !ids.every((id) => have.has(id))
  )
    return { error: "Thứ tự không khớp ảnh trong album." };
  try {
    await reorderPhotos(supabase, albumId, ids);
  } catch {
    return { error: "Chưa lưu được thứ tự, thử lại nhé." };
  }
  if (existing.isPublished) revalidateAlbum(existing.slug);
  return { error: null, ok: true };
}
