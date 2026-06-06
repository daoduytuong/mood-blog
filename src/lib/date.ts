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
