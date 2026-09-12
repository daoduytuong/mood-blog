import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlbumRow, PhotoRow } from "@/lib/db/types";

type DB = SupabaseClient;

// Domain type (camelCase) — ranh giới map snake_case (DB) <-> camelCase (TS).
export interface Photo {
  id: string;
  albumId: string;
  path: string;
  w: number | null;
  h: number | null;
  blurDataURL: string | null;
  alt: string | null;
  caption: string | null;
  position: number;
  camera: string | null;
  lens: string | null;
  focalLength: number | null;
  aperture: number | null;
  shutter: string | null;
  iso: number | null;
  takenAt: string | null;
  createdAt: string;
}

export interface Album {
  id: string;
  authorId: string;
  slug: string;
  title: string;
  place: string | null;
  description: string | null;
  coverPhotoId: string | null;
  shotOn: string | null;
  isPublished: boolean;
  createdAt: string;
  /** Ảnh theo `position` tăng dần. Danh sách: tối đa PREVIEW_N ảnh; trang album: tất cả. */
  photos: Photo[];
  photoCount: number;
  heartCount: number;
  commentCount: number;
}

/** Ảnh bìa: `cover_photo_id` nếu có trong `photos`, không thì ảnh đầu. */
export function albumCover(album: Album): Photo | null {
  return (
    album.photos.find((p) => p.id === album.coverPhotoId) ??
    album.photos[0] ??
    null
  );
}

function toPhoto(r: PhotoRow): Photo {
  return {
    id: r.id,
    albumId: r.album_id,
    path: r.path,
    w: r.w,
    h: r.h,
    blurDataURL: r.blur_data_url,
    alt: r.alt,
    caption: r.caption,
    position: r.position,
    camera: r.camera,
    lens: r.lens,
    focalLength: r.focal_length,
    aperture: r.aperture === null ? null : Number(r.aperture), // numeric -> string qua PostgREST
    shutter: r.shutter,
    iso: r.iso,
    takenAt: r.taken_at,
    createdAt: r.created_at,
  };
}

// Row có thể kèm embed photos + aggregate album_comments(count).
type AlbumRowEmbed = AlbumRow & {
  photos?: PhotoRow[];
  album_comments?: { count: number }[];
};

function toAlbum(r: AlbumRowEmbed): Album {
  const photos = (r.photos ?? []).map(toPhoto).sort((a, b) => a.position - b.position);
  return {
    id: r.id,
    authorId: r.author_id,
    slug: r.slug,
    title: r.title,
    place: r.place,
    description: r.description,
    coverPhotoId: r.cover_photo_id,
    shotOn: r.shot_on,
    isPublished: r.is_published,
    createdAt: r.created_at,
    photos,
    photoCount: photos.length, // ghi đè bằng withCounts() ở danh sách
    heartCount: 0,
    commentCount: r.album_comments?.[0]?.count ?? 0,
  };
}

// Ảnh xem trước cho danh sách: bìa + 3 ảnh (editorial). Query lấy luôn, dùng hay không tính sau.
const PREVIEW_N = 4;
const PHOTO_COLS =
  "id, album_id, path, w, h, blur_data_url, alt, caption, position, camera, lens, focal_length, aperture, shutter, iso, taken_at, created_at";
const LIST_COLS = `*, album_comments(count), photos(${PHOTO_COLS})`;

/**
 * Bổ sung heartCount (view album_heart_counts), photoCount (đếm thật, không phải
 * số ảnh preview) và ảnh bìa nếu cover_photo_id nằm ngoài PREVIEW_N ảnh đầu.
 * Ba query nhỏ, tách khỏi query chính: view/embed hỏng thì chỉ mất số, không mất danh sách.
 */
async function withCounts(sb: DB, albums: Album[]): Promise<Album[]> {
  if (albums.length === 0) return albums;
  const ids = albums.map((a) => a.id);

  const [hearts, photoIds, covers] = await Promise.all([
    sb.from("album_heart_counts").select("album_id, heart_count").in("album_id", ids),
    sb.from("photos").select("album_id").in("album_id", ids),
    (() => {
      const missing = albums
        .filter((a) => a.coverPhotoId && !a.photos.some((p) => p.id === a.coverPhotoId))
        .map((a) => a.coverPhotoId as string);
      return missing.length
        ? sb.from("photos").select(PHOTO_COLS).in("id", missing)
        : Promise.resolve({ data: [] as PhotoRow[], error: null });
    })(),
  ]);

  const heartMap = new Map<string, number>();
  if (!hearts.error && hearts.data)
    for (const r of hearts.data as { album_id: string; heart_count: number }[])
      heartMap.set(r.album_id, r.heart_count);

  const countMap = new Map<string, number>();
  if (!photoIds.error && photoIds.data)
    for (const r of photoIds.data as { album_id: string }[])
      countMap.set(r.album_id, (countMap.get(r.album_id) ?? 0) + 1);

  const coverMap = new Map<string, Photo>();
  if (!covers.error && covers.data)
    for (const r of covers.data as PhotoRow[]) coverMap.set(r.id, toPhoto(r));

  return albums.map((a) => {
    const extraCover = a.coverPhotoId ? coverMap.get(a.coverPhotoId) : undefined;
    return {
      ...a,
      heartCount: heartMap.get(a.id) ?? 0,
      photoCount: countMap.get(a.id) ?? a.photos.length,
      photos: extraCover ? [extraCover, ...a.photos] : a.photos,
    };
  });
}

/** Album đã publish, mới nhất trước, mỗi album kèm PREVIEW_N ảnh đầu. Defensive: lỗi -> []. */
export async function listPublishedAlbums(sb: DB, limit?: number): Promise<Album[]> {
  let q = sb
    .from("albums")
    .select(LIST_COLS)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "photos", ascending: true })
    .limit(PREVIEW_N, { referencedTable: "photos" });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error || !data) return [];
  return withCounts(sb, (data as AlbumRowEmbed[]).map(toAlbum));
}

/** Một album đã publish theo slug, kèm TẤT CẢ ảnh. null nếu không có/chưa publish. */
export async function getPublishedAlbumBySlug(sb: DB, slug: string): Promise<Album | null> {
  const { data, error } = await sb
    .from("albums")
    .select(LIST_COLS)
    .eq("slug", slug)
    .eq("is_published", true)
    .order("position", { referencedTable: "photos", ascending: true })
    .maybeSingle();
  if (error || !data) return null;
  const [album] = await withCounts(sb, [toAlbum(data as AlbumRowEmbed)]);
  return album;
}

/** Slug các album đã publish (generateStaticParams + sitemap). */
export async function listPublishedAlbumSlugs(sb: DB): Promise<string[]> {
  const { data, error } = await sb.from("albums").select("slug").eq("is_published", true);
  if (error || !data) return [];
  return (data as { slug: string }[]).map((r) => r.slug);
}

/** Mọi album của tác giả kể cả nháp (cho /me/anh). RLS albums_author_all lo quyền. */
export async function listAlbumsForAuthor(sb: DB, authorId: string): Promise<Album[]> {
  const { data, error } = await sb
    .from("albums")
    .select(LIST_COLS)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "photos", ascending: true })
    .limit(1, { referencedTable: "photos" });
  if (error || !data) return [];
  return withCounts(sb, (data as AlbumRowEmbed[]).map(toAlbum));
}

/** Một album của tác giả kể cả nháp, kèm TẤT CẢ ảnh (form sửa). */
export async function getAlbumByIdForAuthor(sb: DB, id: string): Promise<Album | null> {
  const { data, error } = await sb
    .from("albums")
    .select(LIST_COLS)
    .eq("id", id)
    .order("position", { referencedTable: "photos", ascending: true })
    .maybeSingle();
  if (error || !data) return null;
  const [album] = await withCounts(sb, [toAlbum(data as AlbumRowEmbed)]);
  return album;
}

/** Slug đã bị chiếm chưa — KHÔNG lọc is_published (nháp cũng giữ slug). Lỗi -> false; unique chặn nốt. */
export async function albumSlugExists(sb: DB, slug: string): Promise<boolean> {
  const { data, error } = await sb.from("albums").select("id").eq("slug", slug).maybeSingle();
  if (error) return false;
  return !!data;
}

/** Tạo album NHÁP (is_published=false) với slug tạm. Trả id. */
export async function createAlbum(
  sb: DB,
  input: { authorId: string; slug: string },
): Promise<string> {
  const { data, error } = await sb
    .from("albums")
    .insert({ author_id: input.authorId, slug: input.slug })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("createAlbum failed");
  return (data as { id: string }).id;
}

export type AlbumPatch = Partial<
  Pick<Album, "title" | "place" | "description" | "shotOn" | "coverPhotoId">
>;

/** Sửa chữ + bìa (KHÔNG đổi slug/is_published — chỉ publishAlbum được đổi). */
export async function updateAlbum(sb: DB, id: string, patch: AlbumPatch): Promise<void> {
  const { error } = await sb
    .from("albums")
    .update({
      title: patch.title,
      place: patch.place,
      description: patch.description,
      shot_on: patch.shotOn,
      cover_photo_id: patch.coverPhotoId,
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Đăng một nháp: đổi slug + bật is_published. Hàm DUY NHẤT sửa hai cột này;
 * tự chốt `.eq("is_published", false)` để không có đường nào đổi slug album ĐÃ đăng.
 */
export async function publishAlbum(sb: DB, id: string, slug: string): Promise<void> {
  const { error } = await sb
    .from("albums")
    .update({ slug, is_published: true })
    .eq("id", id)
    .eq("is_published", false);
  if (error) throw error;
}

/** Xoá album (photos/hearts/comments cascade theo FK; Storage dọn ở action). */
export async function deleteAlbum(sb: DB, id: string): Promise<void> {
  const { error } = await sb.from("albums").delete().eq("id", id);
  if (error) throw error;
}

export interface NewPhoto {
  albumId: string;
  path: string;
  w: number | null;
  h: number | null;
  blurDataURL: string | null;
  position: number;
  alt?: string | null;
  camera?: string | null;
  lens?: string | null;
  focalLength?: number | null;
  aperture?: number | null;
  shutter?: string | null;
  iso?: number | null;
  takenAt?: string | null;
}

export async function insertPhoto(sb: DB, input: NewPhoto): Promise<Photo> {
  const { data, error } = await sb
    .from("photos")
    .insert({
      album_id: input.albumId,
      path: input.path,
      w: input.w,
      h: input.h,
      blur_data_url: input.blurDataURL,
      position: input.position,
      alt: input.alt ?? null,
      camera: input.camera ?? null,
      lens: input.lens ?? null,
      focal_length: input.focalLength ?? null,
      aperture: input.aperture ?? null,
      shutter: input.shutter ?? null,
      iso: input.iso ?? null,
      taken_at: input.takenAt ?? null,
    })
    .select(PHOTO_COLS)
    .single();
  if (error || !data) throw error ?? new Error("insertPhoto failed");
  return toPhoto(data as PhotoRow);
}

export async function updatePhotoText(
  sb: DB,
  id: string,
  patch: { alt?: string | null; caption?: string | null },
): Promise<void> {
  const { error } = await sb
    .from("photos")
    .update({ alt: patch.alt, caption: patch.caption })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePhoto(sb: DB, id: string): Promise<void> {
  const { error } = await sb.from("photos").delete().eq("id", id);
  if (error) throw error;
}

/** Đổi thứ tự: MỘT câu UPDATE qua RPC (migration 0012). `ids` theo thứ tự mới, position = 1..n. */
export async function reorderPhotos(sb: DB, albumId: string, ids: string[]): Promise<void> {
  const { error } = await sb.rpc("reorder_photos", { p_album_id: albumId, p_ids: ids });
  if (error) throw error;
}

/** Path Storage của mọi ảnh trong album (dọn Storage trước khi xoá album). */
export async function listPhotoPaths(sb: DB, albumId: string): Promise<string[]> {
  const { data, error } = await sb.from("photos").select("path").eq("album_id", albumId);
  if (error || !data) return [];
  return (data as { path: string }[]).map((r) => r.path);
}
