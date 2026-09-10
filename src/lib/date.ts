// Định dạng ngày đăng theo giờ VN (Asia/Ho_Chi_Minh).
// Dùng ngày TUYỆT ĐỐI (không "x phút trước") để ổn định với SSG/ISR — tránh stale.
const postDateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return postDateFmt.format(d); // vd "6 tháng 6, 2026"
}

// `created_at` là timestamptz (lưu UTC) nhưng "ngày" của tác giả là ngày giờ VN.
// So ngày trực tiếp trên UTC sẽ lệch: bài đăng 00:30 giờ VN nằm ở 17:30 UTC
// HÔM TRƯỚC. Mọi chỗ cần "ngày nào" (Ngày này năm xưa, lịch cảm xúc) phải đi
// qua đây. "en-CA" cho ra đúng dạng YYYY-MM-DD.
const vnDateFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

export interface VnDate {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  iso: string; // YYYY-MM-DD
}

/** Ngày (giờ VN) của một mốc thời gian. Trả null nếu chuỗi không hợp lệ. */
export function vnDateOf(iso: string): VnDate | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const s = vnDateFmt.format(d); // "2026-09-08"
  const [y, m, day] = s.split("-").map(Number);
  return { year: y, month: m, day, iso: s };
}

/** Hôm nay theo giờ VN. */
export function vnToday(): VnDate {
  return vnDateOf(new Date().toISOString())!;
}
