import type { TextareaHTMLAttributes } from "react";
import { inputClass, type InputSize } from "@/components/ui/Input";

/** Ô nhập nhiều dòng — cùng hình hài Input, không cho kéo giãn (giữ nhịp trang tĩnh). */
export function Textarea({
  size = "md",
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { size?: InputSize }) {
  return (
    <textarea {...rest} className={inputClass(size, `resize-none ${className}`)} />
  );
}
