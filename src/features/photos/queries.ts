import { createPublicClient } from "@/lib/supabase/public";
import {
  listPublishedAlbums,
  getPublishedAlbumBySlug,
  listPublishedAlbumSlugs,
  type Album,
} from "@/lib/db/albums";

// Đọc công khai (client không-cookie -> route giữ ISR). Defensive: lỗi -> [] / null.
export async function getAlbums(): Promise<Album[]> {
  return listPublishedAlbums(createPublicClient());
}

export async function getAlbum(slug: string): Promise<Album | null> {
  return getPublishedAlbumBySlug(createPublicClient(), slug);
}

export async function getAlbumSlugs(): Promise<string[]> {
  return listPublishedAlbumSlugs(createPublicClient());
}

/** Dải "Ảnh mới" trên trang chủ. */
export async function getRecentAlbums(limit = 4): Promise<Album[]> {
  return listPublishedAlbums(createPublicClient(), limit);
}
