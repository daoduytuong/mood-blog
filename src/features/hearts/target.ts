import type { SupabaseClient } from "@supabase/supabase-js";
import { addHeart, removeHeart } from "@/lib/db/hearts";
import { addAlbumHeart, removeAlbumHeart } from "@/lib/db/album-hearts";

/**
 * Một "đích" thả tim: bài (`hearts`) hoặc album (`album_hearts`) — một hệ tim,
 * hai bảng gương. Prop đi qua ranh giới server -> client là CHUỖI `HeartTargetKind`
 * (object chứa hàm không serialize được: prerender /m/[slug] gãy với
 * "Functions cannot be passed directly to Client Components"). Hook client
 * resolve chuỗi thành object qua `resolveHeartTarget()`.
 * `storageKey` tách biệt để id bài và id album (đều uuid) không lẫn vào nhau.
 */
export type HeartTargetKind = "post" | "album";

export const POST_HEARTS: HeartTargetKind = "post";
export const ALBUM_HEARTS: HeartTargetKind = "album";

export interface HeartTarget {
  storageKey: string;
  add: (sb: SupabaseClient, id: string, anonId: string) => Promise<unknown>;
  remove: (sb: SupabaseClient, id: string, anonId: string) => Promise<void>;
}

const TARGETS: Record<HeartTargetKind, HeartTarget> = {
  post: {
    storageKey: "mb_liked", // key cũ — giữ để người xem không mất trạng thái đã thả
    add: addHeart,
    remove: removeHeart,
  },
  album: {
    storageKey: "mb_liked_album",
    add: addAlbumHeart,
    remove: removeAlbumHeart,
  },
};

export function resolveHeartTarget(kind: HeartTargetKind): HeartTarget {
  return TARGETS[kind];
}
