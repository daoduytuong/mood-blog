"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPost, getBySlug } from "@/lib/db/posts";
import { slugify } from "./slug";
import { momentSchema } from "./schema";
import type { MoodCode } from "@/lib/moods";

export interface ComposeState {
  error: string | null;
}

export async function createMoment(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const caption = String(formData.get("caption") ?? "").trim();
  const mood = String(formData.get("mood") ?? "");
  const file = formData.get("image");

  const parsed = momentSchema.safeParse({
    caption: caption || undefined,
    mood,
  });
  if (!parsed.success) return { error: "Chọn một tâm trạng giúp mình nhé." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Thêm một tấm ảnh nhé." };
  }

  // Slug duy nhất (ASCII từ caption; rỗng -> mã ngắn).
  const base = slugify(caption) || `khoanh-khac-${Date.now().toString(36)}`;
  let slug = base;
  for (let i = 2; await getBySlug(supabase, slug); i++) slug = `${base}-${i}`;

  // 1) Upload ảnh TRƯỚC (fail -> không tạo bài, không mồ côi).
  const path = `${user.id}/${slug}-${crypto.randomUUID().slice(0, 8)}.webp`;
  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(path, file, {
      contentType: file.type || "image/webp",
      upsert: false,
    });
  if (upErr) return { error: "Chưa lưu được ảnh, thử lại nhé." };

  // 2) Insert bài SAU (fail -> dọn ảnh mồ côi).
  try {
    await createPost(supabase, {
      authorId: user.id,
      type: "khoanh_khac",
      mood: parsed.data.mood as MoodCode,
      slug,
      caption: caption || null,
      media: [{ path }],
    });
  } catch {
    await supabase.storage.from("media").remove([path]);
    return { error: "Chưa lưu được bài, thử lại nhé." };
  }

  // Về Feed: bài mới nằm trên cùng (UJ-1). Trang chi tiết /m/[slug] xây ở Story 2.4.
  redirect("/");
}
