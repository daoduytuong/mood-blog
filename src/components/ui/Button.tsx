import type { ButtonHTMLAttributes } from "react";

/**
 * Nút dùng chung — gom class lặp ở LoginForm/ComposeForm/EditForm/CommentSection.
 * Bất biến: hover CHỈ đổi màu/viền (không scale/bóng-nở/translate);
 * trạng thái chờ = disabled + ĐỔI CHỮ, KHÔNG spinner quay.
 */
export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent/85",
  // Viền + chữ accent — dáng "Xem thêm" của feed (kiểu nút phụ IG cũ).
  secondary:
    "border border-border bg-surface text-accent-text hover:border-accent",
  quiet:
    "border border-border bg-surface text-text hover:border-accent hover:text-accent-text",
  // Xoá/nguy hiểm: VIỀN, không nút đỏ đặc — giọng không đe doạ.
  danger: "border border-error bg-surface text-error hover:bg-error-soft",
};

const SIZE: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 py-2", // 44px: tap target tối thiểu (a11y)
  sm: "min-h-9 px-3 py-1.5 text-[13px] font-semibold",
};

/** Class nút cho thẻ KHÔNG phải <button> (vd `<Link>`) — tránh bọc component vô ích. */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Đang xử lý: tự disable + `aria-busy`, và hiện `loadingLabel` thay nhãn. */
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  className = "",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
