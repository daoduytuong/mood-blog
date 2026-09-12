import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAlbumByIdForAuthor } from "@/lib/db/albums";
import { AlbumForm } from "@/features/photos/AlbumForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sửa album" };

export default async function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next 16: params async
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?returnTo=/me/anh/${id}`);

  const album = await getAlbumByIdForAuthor(supabase, id);
  if (!album || album.authorId !== user.id) notFound();

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-12">
      <Link href="/me/anh" className="text-sm text-text-muted hover:text-text">← Album của bạn</Link>
      <h1 className="mt-6 font-serif text-2xl font-medium text-text">
        {album.isPublished ? "Sửa album" : "Album nháp"}
      </h1>
      <div className="mt-8">
        <AlbumForm album={album} />
      </div>
    </main>
  );
}
