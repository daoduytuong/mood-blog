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

export { getAnonId };
