"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createPost,
  getBySlug,
  getByIdForAuthor,
  slugExists,
  updatePost,
  deletePost,
} from "@/lib/db/posts";
import { slugify } from "./slug";
import { gocDocSchema } from "./schema";
import { fetchVimeoMeta } from "./vimeo";
import { MOOD_CODES, type MoodCode } from "@/lib/moods";
import type { MediaItem, PostType } from "@/lib/db/types";

export interface ComposeState {
  error: string | null;
  /** Đã lưu xong — cho form inline tự đóng (action không redirect). */
  ok?: boolean;
}

// Slug duy nhất từ một chuỗi gợi ý (kiểm DB).
async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hint: string,
  fallbackPrefix: string,
): Promise<string> {
  const base = slugify(hint) || `${fallbackPrefix}-${Date.now().toString(36)}`;
  let slug = base;
  for (let i = 2; await slugExists(supabase, slug); i++) slug = `${base}-${i}`;
  return slug;
}

const MAX_IMAGES = 10;
const MAX_JOURNEY_ENTRIES = 200; // hành trình dài hơi (vd gym ~2 năm, 2-3 chặng/tuần)
const MAX_ALT = 200; // alt là một câu mô tả, không phải bài viết

// Khử media ảnh từ client (chống tamper): path PHẢI thuộc namespace user; blurDataURL capped.
function sanitizeImageMedia(raw: unknown, userId: string): MediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MediaItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.path !== "string" || !r.path.startsWith(`${userId}/`)) continue;
    const w = Number(r.w) || undefined;
    const h = Number(r.h) || undefined;
    const b = r.blurDataURL;
    const blurDataURL =
      typeof b === "string" && b.startsWith("data:image/") && b.length < 4000 ? b : undefined;
    // Rỗng -> undefined (không lưu chuỗi rỗng): chỗ render fallback về caption.
    const alt =
      typeof r.alt === "string" ? r.alt.trim().slice(0, MAX_ALT) || undefined : undefined;
    out.push({ path: r.path, w, h, blurDataURL, alt });
  }
  return out;
}

// Ghi chú + ngày của một "chặng" hành trình (client gửi; server khử).
function sanitizeEntryMeta(
  note: unknown,
  date: unknown,
): { note?: string; date: string } {
  const n = typeof note === "string" ? note.trim().slice(0, 500) : "";
  const d =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toISOString().slice(0, 10);
  return { note: n || undefined, date: d };
}

// Hành trình — tạo post + chặng đầu tiên (1 ảnh đã upload client-side).
export async function createJourney(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const caption = String(formData.get("caption") ?? "").trim();
  const mood = String(formData.get("mood") ?? "");
  if (!MOOD_CODES.includes(mood as MoodCode))
    return { error: "Chọn một tâm trạng giúp mình nhé." };

  let media: MediaItem[] = [];
  try {
    media = sanitizeImageMedia(JSON.parse(String(formData.get("media") ?? "[]")), user.id);
  } catch {
    media = [];
  }
  if (media.length === 0)
    return { error: "Thêm một tấm ảnh cho chặng đầu tiên nhé." };

  const meta = sanitizeEntryMeta(formData.get("note"), formData.get("date"));
  const entry: MediaItem = { ...media[0], ...meta };

  const slug = await uniqueSlug(supabase, caption, "hanh-trinh");
  try {
    await createPost(supabase, {
      authorId: user.id,
      type: "hanh_trinh",
      mood: mood as MoodCode,
      slug,
      caption: caption || null,
      media: [entry],
    });
  } catch {
    if (entry.path) await supabase.storage.from("media").remove([entry.path]);
    return { error: "Chưa lưu được bài, thử lại nhé." };
  }
  revalidatePath("/"); // ISR: bài mới phải xuất hiện ở Feed NGAY, không đợi hết 300s
  redirect(`/m/${slug}`);
}

// Hành trình — thêm một chặng (append vào media; KHÔNG đổi slug/mood/caption).
export async function addJourneyEntry(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id || !slug) return { error: "Thiếu thông tin bài, thử lại nhé." };

  let media: MediaItem[] = [];
  try {
    media = sanitizeImageMedia(JSON.parse(String(formData.get("media") ?? "[]")), user.id);
  } catch {
    media = [];
  }
  if (media.length === 0) return { error: "Thêm một tấm ảnh nhé." };

  const cleanup = async () => {
    const paths = media.map((m) => m.path).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("media").remove(paths);
  };

  const existing = await getBySlug(supabase, slug);
  if (!existing || existing.id !== id || existing.authorId !== user.id) {
    await cleanup();
    return { error: "Không tìm thấy bài." };
  }
  if (existing.type !== "hanh_trinh") {
    await cleanup();
    return { error: "Bài này không phải hành trình." };
  }
  if (existing.media.length >= MAX_JOURNEY_ENTRIES) {
    await cleanup();
    return { error: "Hành trình này đã đầy — mở một hành trình mới nhé." };
  }

  const meta = sanitizeEntryMeta(formData.get("note"), formData.get("date"));
  const entry: MediaItem = { ...media[0], ...meta };

  try {
    await updatePost(supabase, id, { media: [...existing.media, entry] });
  } catch {
    await cleanup();
    return { error: "Chưa lưu được, thử lại nhé." };
  }

  revalidatePath("/");
  revalidatePath(`/m/${slug}`);
  redirect(`/m/${slug}`);
}

// Hành trình — SỬA một chặng: đổi ảnh (tuỳ chọn) + ngày + ghi chú.
// Nhận diện chặng bằng path CŨ; thay TẠI CHỖ để không đổi thứ tự ("Chặng N" giữ số).
// Ảnh mới đã được client upload lên Storage (như addJourneyEntry); ảnh cũ dọn sau khi DB đã trỏ ảnh mới.
export async function updateJourneyEntry(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const path = String(formData.get("path") ?? ""); // chặng đang sửa
  if (!id || !slug || !path)
    return { error: "Thiếu thông tin chặng, thử lại nhé." };

  // Ảnh mới là TUỲ CHỌN: mảng rỗng = giữ ảnh cũ, chỉ sửa ngày/ghi chú.
  let media: MediaItem[] = [];
  try {
    media = sanitizeImageMedia(JSON.parse(String(formData.get("media") ?? "[]")), user.id);
  } catch {
    media = [];
  }
  const replacement = media[0];

  // Lỗi giữa đường -> dọn ảnh mới vừa upload (tránh rác Storage).
  const cleanupNew = async () => {
    if (replacement?.path)
      await supabase.storage.from("media").remove([replacement.path]);
  };

  const existing = await getBySlug(supabase, slug);
  if (!existing || existing.id !== id || existing.authorId !== user.id) {
    await cleanupNew();
    return { error: "Không tìm thấy bài." };
  }
  if (existing.type !== "hanh_trinh") {
    await cleanupNew();
    return { error: "Bài này không phải hành trình." };
  }
  const idx = existing.media.findIndex((m) => m.path === path);
  if (idx === -1) {
    await cleanupNew();
    return { error: "Không tìm thấy chặng này." };
  }

  const current = existing.media[idx];
  const meta = sanitizeEntryMeta(
    formData.get("note"),
    formData.get("date") || current.date,
  );
  const next = [...existing.media];
  // Đổi ảnh nhưng form sửa chặng KHÔNG có ô alt -> giữ alt cũ, đừng để nó rụng âm thầm.
  next[idx] = replacement
    ? { ...replacement, alt: replacement.alt ?? current.alt, ...meta }
    : { ...current, ...meta };

  try {
    await updatePost(supabase, id, { media: next });
  } catch {
    await cleanupNew();
    return { error: "Chưa lưu được, thử lại nhé." };
  }

  // DB đã trỏ ảnh mới -> gỡ ảnh cũ (best-effort, hụt cũng không hỏng bài).
  if (replacement && current.path)
    await supabase.storage.from("media").remove([current.path]);

  revalidatePath("/");
  revalidatePath(`/m/${slug}`);
  return { error: null, ok: true };
}

// Hành trình — gỡ một chặng (nhận diện bằng path duy nhất; dọn Storage).
export async function removeJourneyEntry(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const path = String(formData.get("path") ?? "");

  const existing = slug ? await getBySlug(supabase, slug) : null;
  if (
    !existing ||
    existing.id !== id ||
    existing.authorId !== user.id ||
    existing.type !== "hanh_trinh" ||
    !path
  )
    redirect(`/m/${slug}/edit`);

  const next = existing.media.filter((m) => m.path !== path);
  if (next.length !== existing.media.length) {
    try {
      await updatePost(supabase, id, { media: next });
    } catch {
      redirect(`/m/${slug}/edit`);
    }
    await supabase.storage.from("media").remove([path]); // best-effort sau khi DB đã gọn
    revalidatePath("/");
    revalidatePath(`/m/${slug}`);
  }
  redirect(`/m/${slug}/edit`);
}

// ===== NHÁP =====
// Nháp = post is_published=false. RLS `posts_public_read using (is_published)`
// đã khiến nó vô hình với mọi đường đọc công khai -> không cần migration.

const DRAFT_TYPES: PostType[] = ["khoanh_khac", "goc_doc", "hanh_trinh"];

/** Lưu nháp: bài chưa đăng, slug TẠM. Slug thật sinh lúc Đăng. */
export async function saveDraft(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const type = String(formData.get("type") ?? "") as PostType;
  if (!DRAFT_TYPES.includes(type)) return { error: "Loại bài không hợp lệ." };

  const mood = String(formData.get("mood") ?? "");
  if (!MOOD_CODES.includes(mood as MoodCode))
    return { error: "Chọn một tâm trạng giúp mình nhé." };

  const caption = String(formData.get("caption") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();

  // Góc đọc: ràng buộc DB `goc_doc_has_source` đòi có link HOẶC trích, kể cả
  // khi còn là nháp -> chặn ở đây để không ăn lỗi insert khó hiểu.
  if (type === "goc_doc" && !linkUrl && !excerpt)
    return { error: "Thêm một link hoặc đoạn trích nhé." };

  let media: MediaItem[] = [];
  try {
    media = sanitizeImageMedia(
      JSON.parse(String(formData.get("media") ?? "[]")),
      user.id,
    );
  } catch {
    media = [];
  }
  if (media.length > MAX_IMAGES) media = media.slice(0, MAX_IMAGES);

  // Hành trình: chặng đầu mang ngày + ghi chú (như createJourney).
  if (type === "hanh_trinh" && media[0]) {
    const meta = sanitizeEntryMeta(formData.get("note"), formData.get("date"));
    media = [{ ...media[0], ...meta }];
  }

  // Hint RỖNG -> luôn ra dạng `nhap-<base36>`. Cố ý KHÔNG truyền caption: slug
  // sẽ sinh lại lúc đăng, sinh theo caption ở đây chỉ tạo hai slug cho một bài.
  const slug = await uniqueSlug(supabase, "", "nhap");
  try {
    await createPost(supabase, {
      authorId: user.id,
      type,
      mood: mood as MoodCode,
      slug,
      caption: caption || null,
      excerpt: excerpt || null,
      linkUrl: linkUrl || null,
      media,
      isPublished: false,
    });
  } catch {
    const paths = media.map((m) => m.path).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("media").remove(paths);
    return { error: "Chưa lưu được nháp, thử lại nhé." };
  }

  // KHÔNG revalidatePath: nháp không lên trang công khai nào, và /me là
  // force-dynamic nên tự tươi.
  redirect("/me");
}

/** Sửa nháp: chữ + tâm trạng. Từ chối nếu bài đã đăng. */
export async function updateDraft(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu thông tin bài, thử lại nhé." };

  const existing = await getByIdForAuthor(supabase, id);
  if (!existing || existing.authorId !== user.id)
    return { error: "Không tìm thấy bài." };
  // Bất biến: bài ĐÃ đăng không đi qua đường nháp (kiểm ở SERVER, không chỉ ở UI).
  if (existing.isPublished) return { error: "Bài này đã đăng rồi." };

  const mood = String(formData.get("mood") ?? "");
  if (!MOOD_CODES.includes(mood as MoodCode))
    return { error: "Chọn một tâm trạng giúp mình nhé." };

  const caption = String(formData.get("caption") ?? "").trim();
  const patch: Parameters<typeof updatePost>[2] = {
    mood: mood as MoodCode,
    caption: caption || null,
  };

  if (existing.type === "goc_doc") {
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
  // Nháp không nằm trên trang công khai nào -> không revalidate.
  return { error: null, ok: true };
}

// Khoảnh khắc ẢNH (1..N) — ảnh đã được client upload lên Storage; action chỉ insert post.
export async function createMomentImages(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập đã nhé." };

  const caption = String(formData.get("caption") ?? "").trim();
  const mood = String(formData.get("mood") ?? "");
  if (!MOOD_CODES.includes(mood as MoodCode))
    return { error: "Chọn một tâm trạng giúp mình nhé." };

  let media: MediaItem[] = [];
  try {
    media = sanitizeImageMedia(JSON.parse(String(formData.get("media") ?? "[]")), user.id);
  } catch {
    media = [];
  }
  if (media.length === 0) return { error: "Thêm ít nhất một tấm ảnh nhé." };
  if (media.length > MAX_IMAGES) media = media.slice(0, MAX_IMAGES);

  const slug = await uniqueSlug(supabase, caption, "khoanh-khac");
  try {
    await createPost(supabase, {
      authorId: user.id,
      type: "khoanh_khac",
      mood: mood as MoodCode,
      slug,
      caption: caption || null,
      media,
    });
  } catch {
    // Dọn ảnh mồ côi đã upload từ client (RLS author delete cho authenticated).
    const paths = media.map((m) => m.path).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("media").remove(paths);
    return { error: "Chưa lưu được bài, thử lại nhé." };
  }
  revalidatePath("/"); // ISR: bài mới phải xuất hiện ở Feed NGAY
  redirect("/");
}

// Story 1.5b — Khoảnh khắc dạng VIDEO Vimeo. KHÔNG tự host: chỉ lưu provider+id+poster.
export async function createMomentVideo(
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
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();

  if (!MOOD_CODES.includes(mood as MoodCode))
    return { error: "Chọn một tâm trạng giúp mình nhé." };
  if (!videoUrl) return { error: "Dán link video Vimeo nhé." };

  // oEmbed server-side: validate + lấy poster. Lỗi/private/không tồn tại -> nhắc nhẹ.
  const meta = await fetchVimeoMeta(videoUrl);
  if (!meta) return { error: "Link video chưa hợp lệ, kiểm lại nhé." };

  const slug = await uniqueSlug(supabase, caption, "khoanh-khac");
  try {
    await createPost(supabase, {
      authorId: user.id,
      type: "khoanh_khac",
      mood: mood as MoodCode,
      slug,
      caption: caption || null,
      media: [
        {
          provider: "vimeo",
          video_id: meta.videoId,
          poster_url: meta.posterUrl,
        },
      ],
    });
  } catch {
    return { error: "Chưa lưu được bài, thử lại nhé." };
  }

  revalidatePath("/"); // ISR: bài mới phải xuất hiện ở Feed NGAY
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

  revalidatePath("/"); // ISR: bài mới phải xuất hiện ở Feed NGAY
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
// Đọc theo ID, KHÔNG theo slug: `getBySlug` lọc `is_published = true` nên bản
// cũ không xoá nổi NHÁP. Đọc theo id cũng bớt mong manh khi dọn Storage.
export async function deletePostAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/");

  const existing = await getByIdForAuthor(supabase, id);
  if (!existing || existing.authorId !== user.id) redirect("/");

  const wasPublished = existing.isPublished;
  const slug = existing.slug;

  // Dọn ảnh ở Storage (best-effort) trước khi xoá hàng — tránh rác.
  const paths = existing.media
    .map((m) => m.path)
    .filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from("media").remove(paths);

  try {
    await deletePost(supabase, id); // RLS đảm bảo chỉ author xoá được
  } catch {
    // Xoá hụt -> quay lại chỗ vừa đứng, không nuốt lỗi âm thầm.
    redirect(wasPublished ? `/m/${slug}` : "/me");
  }

  // Nháp chưa từng nằm trên trang công khai nào -> không cần revalidate.
  if (wasPublished) {
    revalidatePath(`/m/${slug}`);
    revalidatePath("/");
    redirect("/");
  }
  redirect("/me");
}
