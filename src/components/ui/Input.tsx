import type { InputHTMLAttributes } from "react";

/**
 * Ô nhập một dòng. Giữ đúng hình hài đang ship ("Nguyên bản": viền 1px, bo nhẹ,
 * focus đổi viền sang accent). `aria-invalid` tự đổi viền sang màu lỗi.
 *
 * Kích cỡ đi qua prop `size`, KHÔNG qua className: hai utility cùng thuộc tính
 * (py-2 vs py-1.5) tranh nhau theo thứ tự trong FILE CSS sinh ra, không theo thứ
 * tự viết trong JSX -> chồng bằng className là hành vi bất định.
 */
export type InputSize = "md" | "sm";

const INPUT_BASE =
  "border border-border bg-surface text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent aria-invalid:border-error";

const INPUT_SIZE: Record<InputSize, string> = {
  md: "rounded-md px-3 py-2",
  sm: "rounded-sm px-3 py-1.5 text-[13px]", // hàng sửa gọn (vd trình sửa chặng)
};

export function inputClass(size: InputSize = "md", className = "") {
  return `${INPUT_BASE} ${INPUT_SIZE[size]} ${className}`;
}

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
}

export function Input({ size = "md", className = "", ...rest }: InputProps) {
  return <input {...rest} className={inputClass(size, className)} />;
}
