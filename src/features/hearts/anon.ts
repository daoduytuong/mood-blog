// Story 1.10: danh tính ẩn danh nhẹ + ghi nhớ "đã thả tim" phía client.
// anon_id là vanity-metric (client-asserted): xoá localStorage/đổi thiết bị -> id mới. Không PII.
// Vì RLS chặn anon SELECT hearts, trạng thái "đã thả" CHỈ suy từ localStorage.
const ANON_KEY = "mb_anon";
const LIKED_KEY = "mb_liked";

export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function getLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function hasLiked(postId: string): boolean {
  return getLikedSet().has(postId);
}

export function markLiked(postId: string): void {
  if (typeof window === "undefined") return;
  try {
    const s = getLikedSet();
    s.add(postId);
    localStorage.setItem(LIKED_KEY, JSON.stringify([...s]));
  } catch {
    /* localStorage không khả dụng -> bỏ qua (chấp nhận) */
  }
}
