import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16: file convention 'middleware.ts' đổi thành 'proxy.ts' (export proxy + config).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Chạy cho mọi route trừ static asset / ảnh (tối ưu).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
