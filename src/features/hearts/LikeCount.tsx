"use client";

import { useEffect, useState } from "react";
import { useHeart } from "./useHeart";
import { hasLiked } from "./anon";

// Số tim công khai (view heart_counts) + optimistic theo trạng thái tim local.
// serverCount đến từ ISR (stale tối đa 300s) nên có thể đã/chưa gồm tim của mình.
// Chống đếm đôi: baseline = trạng thái liked lúc mount (đọc localStorage trong
// effect — SSR/hydration render giữ nguyên serverCount nên không lệch hydration);
// chỉ cộng/trừ khi liked ĐỔI so với baseline.
export function LikeCount({
  postId,
  serverCount,
}: {
  postId: string;
  serverCount: number;
}) {
  const { liked } = useHeart(postId);
  const [baseline, setBaseline] = useState<boolean | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chốt baseline 1 lần khi mount (đọc localStorage, SSR không có)
    setBaseline(hasLiked(postId));
  }, [postId]);

  const delta =
    baseline === null ? 0 : (liked ? 1 : 0) - (baseline ? 1 : 0);
  const n = Math.max(0, serverCount + delta);
  if (n === 0) return null;

  return <p className="text-[13px] font-semibold text-text">{n} lượt tim</p>;
}
