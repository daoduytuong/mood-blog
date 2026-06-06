import { createPublicClient } from "@/lib/supabase/public";
import { listPublished, type Post } from "@/lib/db/posts";

// Lấy Feed công khai (client không-cookie -> giữ ISR). Defensive: lỗi -> [].
export async function getFeedPosts(): Promise<Post[]> {
  return listPublished(createPublicClient());
}
