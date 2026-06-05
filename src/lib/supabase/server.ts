import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/env";

// Supabase client phía server (Tác giả đã đăng nhập: soạn/sửa/xoá, xem tổng tim).
// Next 16: cookies() là async -> phải await.
// Việc refresh session ở mỗi request do proxy/middleware lo (Story 1.4).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Gọi từ Server Component -> bỏ qua; proxy/middleware (Story 1.4) sẽ refresh cookie.
          }
        },
      },
    },
  );
}
