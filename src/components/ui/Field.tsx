import type { ReactNode } from "react";

/** Nhãn + ô nhập + gợi ý/lỗi của MỘT field. Nhãn bọc ngoài nên bấm nhãn là focus ô. */
export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm text-text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
      {error && <span className="text-sm text-error">{error}</span>}
    </label>
  );
}

/**
 * Lỗi ở mức cả form. Trước đây dùng `text-text-muted` (lỗi tàng hình);
 * giờ dùng token `--color-error` — vẫn giọng ấm, không đe doạ.
 */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-error">
      {children}
    </p>
  );
}
