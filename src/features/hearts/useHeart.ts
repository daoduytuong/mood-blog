"use client";

import { useSyncExternalStore, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { addHeart, removeHeart } from "@/lib/db/hearts";
import { getAnonId, hasLiked, markLiked, unmarkLiked } from "./anon";

// Store ngoài tối giản để useSyncExternalStore re-đọc localStorage khi có thay đổi.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach((l) => l());
}

// Story 3.1 (thả) + 3.2 (gỡ): toggle tim ẩn danh.
// "Đã thả" suy từ localStorage; useSyncExternalStore lo SSR (server=false)
// -> không hydration mismatch, không setState-trong-effect.
export function useHeart(postId: string) {
  const liked = useSyncExternalStore(
    subscribe,
    () => hasLiked(postId), // snapshot client
    () => false, // snapshot server (SSR)
  );
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (pending) return;
    const next = !liked;
    // optimistic: cập nhật localStorage + re-đọc (fade ấm/mờ ngay)
    if (next) markLiked(postId);
    else unmarkLiked(postId);
    emit();

    const anonId = getAnonId();
    startTransition(async () => {
      try {
        const sb = createClient();
        if (next) await addHeart(sb, postId, anonId); // 23505 -> already, im lặng
        else await removeHeart(sb, postId, anonId);
      } catch {
        // Lỗi mạng/giới hạn: IM LẶNG, giữ trạng thái hiện tại (Cross-Cutting: không mắng).
      }
    });
  }

  return { liked, pending, toggle };
}
