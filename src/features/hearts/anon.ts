// Story 1.10: danh tính ẩn danh nhẹ + ghi nhớ "đã thả tim" phía client.
// anon_id là vanity-metric (client-asserted): xoá localStorage/đổi thiết bị -> id mới. Không PII.
// Vì RLS chặn anon SELECT bảng tim, trạng thái "đã thả" CHỈ suy từ localStorage.
// `storageKey` do HeartTarget cung cấp: "mb_liked" cho bài, "mb_liked_album" cho album.
const ANON_KEY = "mb_anon";

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

function getLikedSet(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function hasLiked(storageKey: string, id: string): boolean {
  return getLikedSet(storageKey).has(id);
}

function setLiked(storageKey: string, id: string, liked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const s = getLikedSet(storageKey);
    if (liked) s.add(id);
    else s.delete(id);
    localStorage.setItem(storageKey, JSON.stringify([...s]));
  } catch {
    /* localStorage không khả dụng -> bỏ qua (chấp nhận) */
  }
}

export function markLiked(storageKey: string, id: string): void {
  setLiked(storageKey, id, true);
}

export function unmarkLiked(storageKey: string, id: string): void {
  setLiked(storageKey, id, false);
}
