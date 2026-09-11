import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getByIdForAuthor } from "@/lib/db/posts";
import { ComposeForm } from "@/features/compose/ComposeForm";

// Nháp chỉ tác giả thấy + đọc session -> không cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sửa nháp" };

export default async function EditDraftPage({
  params,
}: {
  params: Promise<{ id: string }>; // Next 16: params async
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?returnTo=/me/nhap/${id}`); // double-check ngoài proxy guard

  const post = await getByIdForAuthor(supabase, id);
  // Đã đăng thì KHÔNG sửa qua đường nháp — bất biến giữ theo cấu trúc route.
  if (!post || post.authorId !== user.id || post.isPublished) notFound();

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-12">
      <Link href="/me" className="text-sm text-text-muted hover:text-text">
        ← Về trang của bạn
      </Link>
      <h1 className="mt-6 font-serif text-2xl font-medium text-text">
        Sửa nháp
      </h1>
      <div className="mt-8">
        <ComposeForm
          draft={{
            id: post.id,
            type: post.type,
            mood: post.mood,
            caption: post.caption ?? "",
            excerpt: post.excerpt ?? "",
            linkUrl: post.linkUrl ?? "",
            media: post.media,
          }}
        />
      </div>
    </main>
  );
}
