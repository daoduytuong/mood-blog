import { getAnonId } from "@/features/hearts/anon";

// Danh tính khách "nhẹ": tên tự khai lưu localStorage (dùng CHUNG anon_id với tim).
// Không PII, không tài khoản. Xoá localStorage/đổi máy -> danh tính mới.
const NAME_KEY = "mb_name";

export function getCommenterName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setCommenterName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* localStorage không khả dụng -> bỏ qua */
  }
}

// Throttle nhẹ (best-effort, $0): chặn flood gửi liên tiếp. Bypass được khi xoá localStorage
// nhưng đủ tốt cho hobby + đi kèm honeypot. Lát 2.
const LAST_KEY = "mb_last_comment";
export const COMMENT_THROTTLE_MS = 30_000;

export function lastCommentAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(LAST_KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function markCommented(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {
    /* bỏ qua */
  }
}

export { getAnonId };
