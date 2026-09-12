"use client";

import { useSyncExternalStore, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAnonId, hasLiked, markLiked, unmarkLiked } from "./anon";
import type { HeartTarget } from "./target";

// Store ngoài tối giản để useSyncExternalStore re-đọc localStorage khi có thay đổi.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach((l) => l());
}

// Story 3.1 (thả) + 3.2 (gỡ): toggle tim ẩn danh cho MỘT target (bài hoặc album).
// "Đã thả" suy từ localStorage; useSyncExternalStore lo SSR (server=false)
// -> không hydration mismatch, không setState-trong-effect.
export function useHeart(target: HeartTarget, id: string) {
  const liked = useSyncExternalStore(
    subscribe,
    () => hasLiked(target.storageKey, id), // snapshot client
    () => false, // snapshot server (SSR)
  );
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (pending) return;
    const next = !liked;
    if (next) markLiked(target.storageKey, id);
    else unmarkLiked(target.storageKey, id);
    emit();

    const anonId = getAnonId();
    startTransition(async () => {
      try {
        const sb = createClient();
        if (next) await target.add(sb, id, anonId); // 23505 -> already, im lặng
        else await target.remove(sb, id, anonId);
      } catch {
        // Lỗi mạng/giới hạn: IM LẶNG, giữ trạng thái hiện tại (Cross-Cutting: không mắng).
      }
    });
  }

  return { liked, pending, toggle };
}
