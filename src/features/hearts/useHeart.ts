"use client";

import { useSyncExternalStore, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { addHeart } from "@/lib/db/hearts";
import { getAnonId, hasLiked, markLiked } from "./anon";

// Store ngoài tối giản để useSyncExternalStore re-đọc localStorage khi có thay đổi.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach((l) => l());
}

// Story 3.1: thả tim (insert ẩn danh + RLS insert-only). Untap = Story 3.2.
// "Đã thả" suy từ localStorage; useSyncExternalStore lo SSR (server=false)
// -> không hydration mismatch, không setState-trong-effect.
export function useHeart(postId: string) {
  const liked = useSyncExternalStore(
    subscribe,
    () => hasLiked(postId), // snapshot client
    () => false, // snapshot server (SSR)
  );
  const [pending, startTransition] = useTransition();

  function like() {
    if (liked || pending) return;
    markLiked(postId); // optimistic: ghi localStorage
    emit(); // -> re-đọc -> liked = true (fade ấm ngay)
    startTransition(async () => {
      try {
        await addHeart(createClient(), postId, getAnonId());
        // 23505 (đã thả) được addHeart coi là thành công im lặng.
      } catch {
        // Lỗi mạng/giới hạn: IM LẶNG, giữ trạng thái ấm (Cross-Cutting: không mắng người dùng).
      }
    });
  }

  return { liked, pending, like };
}
