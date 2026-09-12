import type { SupabaseClient } from "@supabase/supabase-js";
import { addHeart, removeHeart } from "@/lib/db/hearts";
import { addAlbumHeart, removeAlbumHeart } from "@/lib/db/album-hearts";

/**
 * Một "đích" thả tim: bài (`hearts`) hoặc album (`album_hearts`). Hook/nút tim
 * nhận target thay vì gắn cứng bảng — một hệ tim, hai bảng gương.
 * `storageKey` tách biệt để id bài và id album (đều uuid) không lẫn vào nhau.
 */
export interface HeartTarget {
  storageKey: string;
  add: (sb: SupabaseClient, id: string, anonId: string) => Promise<unknown>;
  remove: (sb: SupabaseClient, id: string, anonId: string) => Promise<void>;
}

export const POST_HEARTS: HeartTarget = {
  storageKey: "mb_liked", // key cũ — giữ để người xem không mất trạng thái đã thả
  add: addHeart,
  remove: removeHeart,
};

export const ALBUM_HEARTS: HeartTarget = {
  storageKey: "mb_liked_album",
  add: addAlbumHeart,
  remove: removeAlbumHeart,
};
