import { createPublicClient } from "@/lib/supabase/public";
import { listMoodStamps, type PostMoodStamp } from "@/lib/db/posts";

// Mốc ngày+tâm trạng của mọi bài (client không-cookie -> `/lich` giữ ISR).
export async function getMoodStamps(): Promise<PostMoodStamp[]> {
  return listMoodStamps(createPublicClient());
}
