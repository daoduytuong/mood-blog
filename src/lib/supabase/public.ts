import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";

// Client công khai (KHÔNG đọc cookie) cho đọc tĩnh/ISR ở Feed & trang chi tiết.
// Dùng anon role + RLS `posts_public_read`. Không gắn cookie -> trang giữ được static/ISR.
export function createPublicClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
}
