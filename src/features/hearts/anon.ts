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

function setLiked(postId: string, liked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const s = getLikedSet();
    if (liked) s.add(postId);
    else s.delete(postId);
    localStorage.setItem(LIKED_KEY, JSON.stringify([...s]));
  } catch {
    /* localStorage không khả dụng -> bỏ qua (chấp nhận) */
  }
}

export function markLiked(postId: string): void {
  setLiked(postId, true);
}

export function unmarkLiked(postId: string): void {
  setLiked(postId, false);
}
