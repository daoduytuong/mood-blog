/**
 * Gom lỗi từ mọi tầng Supabase (PostgrestError, StorageError, AuthError) và
 * Error thường về MỘT dòng ngắn: "[mã] thông điệp · chi tiết · gợi ý".
 *
 * Dùng ở màn TÁC GIẢ (đã đăng nhập) và trong console — không đưa chuỗi này ra
 * trang công khai: nó lộ tên ràng buộc/bảng, vô ích với khách và lộ cấu trúc DB.
 */
type ErrorLike = {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  /** StorageApiError cũ trả thêm `error: "Bucket not found"`. */
  error?: unknown;
};

function text(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

export function describeError(e: unknown): string {
  if (e == null) return "lỗi không rõ";
  if (typeof e === "string") return e.trim() || "lỗi không rõ";

  const o = e as ErrorLike;
  const code = text(o.code) ?? text(o.statusCode) ?? text(o.status);
  const head =
    text(o.message) ??
    text(o.error) ??
    (e instanceof Error ? e.message : null) ??
    safeStringify(e);
  const body = [head, text(o.details), text(o.hint)].filter(Boolean).join(" · ");

  return code ? `[${code}] ${body}` : body;
}

function safeStringify(e: unknown): string {
  try {
    const s = JSON.stringify(e);
    return s && s !== "{}" ? s.slice(0, 300) : "lỗi không rõ";
  } catch {
    return "lỗi không rõ";
  }
}
