import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBySlug } from "@/lib/db/posts";
import { AddEntryForm } from "@/features/journey/AddEntryForm";

export const dynamic = "force-dynamic"; // chỉ-Tác-giả, đọc cookies -> luôn động

// Thêm một chặng vào bài Hành trình (flow nhanh: /me -> bài -> Thêm chặng).
export default async function AddEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?returnTo=/m/${slug}/add`);

  const post = await getBySlug(supabase, slug);
  if (!post) notFound();
  if (post.authorId !== user.id || post.type !== "hanh_trinh")
    redirect(`/m/${slug}`);

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <Link
        href={`/m/${slug}`}
        className="text-sm text-text-muted hover:text-text"
      >
        ← Về bài
      </Link>
      <h1
        className="mt-4 text-xl text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Thêm chặng mới
      </h1>
      <p className="mb-6 mt-1 text-sm text-text-muted">
        {post.caption || "Hành trình"} · chặng thứ {post.media.length + 1}
      </p>

      <AddEntryForm id={post.id} slug={post.slug} />
    </main>
  );
}
