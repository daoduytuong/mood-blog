import { brandIcon } from "@/lib/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon (màn hình chính iOS) — Next special file.
export default function AppleIcon() {
  return brandIcon(180);
}
