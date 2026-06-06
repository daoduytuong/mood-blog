import { brandIcon } from "@/lib/brand-icon";

// Icon 512 cho manifest (Android "Thêm vào màn hình chính").
export function GET() {
  return brandIcon(512);
}
