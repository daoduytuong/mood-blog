import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/env";

// Supabase client cho phía browser (Người xem ẩn danh: đọc feed, thả tim qua anon key + RLS).
// (Chưa gắn generic <Database> — sẽ bật khi có `supabase gen types`; lib/db lo việc map kiểu.)
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
