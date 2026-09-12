import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAlbumsForAuthor, albumCover } from "@/lib/db/albums";
import { countsForAuthorAlbums } from "@/lib/db/album-hearts";
import { photoPublicUrl } from "@/lib/storage";
import { formatPostDate } from "@/lib/date";
import { Button } from "@/components/ui/Button";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { createDraftAlbum } from "@/features/photos/actions";
import { DeleteAlbumButton } from "@/features/photos/AlbumForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Album của bạn" };

export default async function MyAlbumsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/me/anh");

  const [albums, hearts] = await Promise.all([
    listAlbumsForAuthor(supabase, user.id),
    countsForAuthorAlbums(supabase),
  ]);
  const drafts = albums.filter((a) => !a.isPublished);
  const published = albums.filter((a) => a.isPublished);

  const Row = ({ a }: { a: (typeof albums)[number] }) => {
    const c = albumCover(a);
    return (
      <li className="flex items-center gap-2 pr-3">
        <Link href={`/me/anh/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-3 transition-colors hover:bg-background">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-border/40">
            {c && <Image src={photoPublicUrl(c.path)} alt="" fill sizes="56px" className="object-cover" />}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="line-clamp-1 text-sm text-text">{a.title || "Chưa đặt tên"}</p>
            <p className="text-xs text-text-muted">
              {a.photoCount} ảnh · {formatPostDate(a.createdAt)}
              {a.isPublished && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <HeartIcon size={12} fillOpacity={1} strokeWidth={1.5} />
                  {hearts[a.id] ?? 0}
                </span>
              )}
            </p>
          </div>
        </Link>
        <DeleteAlbumButton id={a.id} title={a.title} />
      </li>
    );
  };

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-medium text-text">Album của bạn</h1>
        <form action={createDraftAlbum}>
          <Button type="submit" size="sm">+ Album mới</Button>
        </form>
      </div>

      {drafts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-lg font-medium text-text">
            Nháp <span className="text-sm text-text-muted">({drafts.length})</span>
          </h2>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {drafts.map((a) => <Row key={a.id} a={a} />)}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-lg font-medium text-text">Đã đăng</h2>
        {published.length === 0 ? (
          <p className="font-serif text-text-muted">Chưa có album nào. Bấm &quot;Album mới&quot; để bắt đầu.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {published.map((a) => <Row key={a.id} a={a} />)}
          </ul>
        )}
      </section>
    </main>
  );
}
