"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createPost,
  getBySlug,
  updatePost,
  deletePost,
} from "@/lib/db/posts";
import { slugify } from "./slug";
import { momentSchema, gocDocSchema } from "./schema";
import { MOOD_CODES, type MoodCode } from "@/lib/moods";

export interface ComposeState {
  error: string | null;
}

// Slug duy nhất từ một chuỗi gợi ý (kiểm DB).
async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hint: string,
  fallbackPrefix: string,
): Promise<string> {
  const base = slugify(hint) || `${fallbackPrefix}-${Date.now().toString(36)}`;
  let slug = base;
  for (let i = 2; await getBySlug(supabase, slug); i++) slug = `${base}-${i}`;
  return slug;
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
  // Kích thước + blur preview (blur-up chống CLS — Story 2.3). Cap blurDataURL phòng rác.
  const width = Number(formData.get("width")) || undefined;
  const height = Number(formData.get("height")) || undefined;
  const rawBlur = String(formData.get("blurDataURL") ?? "");
  const blurDataURL =
    rawBlur.startsWith("data:image/") && rawBlur.length < 4000
      ? rawBlur
      : undefined;

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
      media: [{ path, w: width, h: height, blurDataURL }],
    });
  } catch {
    await supabase.storage.from("media").remove([path]);
    return { error: "Chưa lưu được bài, thử lại nhé." };
  }

  // Về Feed: bài mới nằm trên cùng (UJ-1). Trang chi tiết /m/[slug] xây ở Story 2.4.
  redirect("/");
}

export async function createGocDoc(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const caption = String(formData.get("caption") ?? "").trim(); // cảm nhận
  const excerpt = String(formData.get("excerpt") ?? "").trim(); // đoạn trích (tự nhập, KHÔNG fetch -> tránh SSRF)
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  const mood = String(formData.get("mood") ?? "");

  const parsed = gocDocSchema.safeParse({
    caption: caption || undefined,
    excerpt: excerpt || undefined,
    linkUrl: linkUrl || undefined,
    mood,
  });
  if (!parsed.success) {
    const paths = parsed.error.issues.map((i) => i.path[0]);
    if (paths.includes("mood"))
      return { error: "Chọn một tâm trạng giúp mình nhé." };
    if (paths.includes("linkUrl"))
      return { error: "Link chưa hợp lệ, kiểm lại nhé." };
    return { error: "Có gì đó chưa ổn, thử lại nhé." };
  }
  if (!linkUrl && !excerpt) {
    return { error: "Thêm một link hoặc đoạn trích nhé." };
  }

  const slug = await uniqueSlug(supabase, excerpt || caption, "goc-doc");

  try {
    await createPost(supabase, {
      authorId: user.id,
      type: "goc_doc",
      mood: parsed.data.mood as MoodCode,
      slug,
      caption: caption || null,
      excerpt: excerpt || null,
      linkUrl: linkUrl || null,
    });
  } catch {
    return { error: "Chưa lưu được bài, thử lại nhé." };
  }

  redirect("/");
}

// Story 1.7 — sửa NỘI DUNG + TÂM TRẠNG (KHÔNG đổi slug, KHÔNG đổi ảnh/loại).
// Ảnh giữ nguyên (thay ảnh là phạm vi khác); slug giữ để OG/sitemap/link không gãy.
export async function updatePostAction(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const type = String(formData.get("type") ?? "");
  const mood = String(formData.get("mood") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  if (!id || !slug) return { error: "Thiếu thông tin bài, thử lại nhé." };
  if (!MOOD_CODES.includes(mood as MoodCode))
    return { error: "Chọn một tâm trạng giúp mình nhé." };

  // RLS posts_author_all chỉ cho author sửa; vẫn kiểm chủ sở hữu để báo lỗi tử tế.
  const existing = await getBySlug(supabase, slug);
  if (!existing || existing.id !== id) return { error: "Không tìm thấy bài." };
  if (existing.authorId !== user.id)
    return { error: "Bài này không phải của bạn." };

  const patch: Parameters<typeof updatePost>[2] = {
    mood: mood as MoodCode,
    caption: caption || null,
  };

  if (type === "goc_doc") {
    const excerpt = String(formData.get("excerpt") ?? "").trim();
    const linkUrl = String(formData.get("linkUrl") ?? "").trim();
    if (!linkUrl && !excerpt)
      return { error: "Thêm một link hoặc đoạn trích nhé." };
    if (linkUrl) {
      try {
        new URL(linkUrl);
      } catch {
        return { error: "Link chưa hợp lệ, kiểm lại nhé." };
      }
    }
    patch.excerpt = excerpt || null;
    patch.linkUrl = linkUrl || null;
  }

  try {
    await updatePost(supabase, id, patch);
  } catch {
    return { error: "Chưa lưu được, thử lại nhé." };
  }

  // ISR: Feed + chi tiết tươi ngay (đổi mood -> đổi màu, đổi caption -> đổi text/OG).
  revalidatePath("/");
  revalidatePath(`/m/${slug}`);
  redirect(`/m/${slug}`);
}

// Story 1.7 — xoá bài (hearts cascade theo FK -> tổng tim /me tự rụng).
export async function deletePostAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) redirect("/");

  // Dọn ảnh ở Storage (best-effort) trước khi xoá hàng — tránh rác.
  const existing = slug ? await getBySlug(supabase, slug) : null;
  if (existing && existing.authorId === user.id) {
    const paths = existing.media
      .map((m) => m.path)
      .filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("media").remove(paths);
  }

  try {
    await deletePost(supabase, id); // RLS đảm bảo chỉ author xoá được
  } catch {
    redirect(`/m/${slug}`); // xoá hụt -> quay lại bài, không nuốt lỗi âm thầm
  }

  if (slug) revalidatePath(`/m/${slug}`);
  revalidatePath("/");
  redirect("/");
}
