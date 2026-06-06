import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBySlug } from "@/lib/db/posts";
import { mediaPublicUrl } from "@/lib/storage";
import { EditForm } from "@/features/compose/EditForm";

export const dynamic = "force-dynamic"; // chỉ-Tác-giả, đọc cookies -> luôn động

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?returnTo=/m/${slug}/edit`);

  const post = await getBySlug(supabase, slug);
  if (!post) notFound();
  if (post.authorId !== user.id) redirect(`/m/${slug}`); // không phải bài của bạn

  const imgPath =
    post.type === "khoanh_khac" ? post.media[0]?.path : undefined;

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <Link
        href={`/m/${slug}`}
        className="text-sm text-text-muted hover:text-text"
      >
        ← Về bài
      </Link>
      <h1
        className="mb-6 mt-4 text-xl text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Sửa bài
      </h1>

      {imgPath && (
        <div className="relative mb-6 aspect-4/3 w-full overflow-hidden rounded-lg bg-background">
          <Image
            src={mediaPublicUrl(imgPath)}
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, 600px"
            className="object-cover"
          />
          <span className="absolute bottom-2 left-2 rounded bg-surface/85 px-2 py-0.5 text-xs text-text-muted">
            Ảnh giữ nguyên — chỉ sửa nội dung & tâm trạng
          </span>
        </div>
      )}

      <EditForm
        id={post.id}
        slug={post.slug}
        type={post.type}
        initialMood={post.mood}
        initialCaption={post.caption ?? ""}
        initialExcerpt={post.excerpt ?? ""}
        initialLinkUrl={post.linkUrl ?? ""}
      />
    </main>
  );
}
