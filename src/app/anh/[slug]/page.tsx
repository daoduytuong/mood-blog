import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { albumCover } from "@/lib/db/albums";
import { listAlbumComments } from "@/lib/db/album-comments";
import { getAlbum, getAlbumSlugs } from "@/features/photos/queries";
import { photoPublicUrl } from "@/lib/storage";
import { siteUrl } from "@/lib/site";
import { formatPostDate } from "@/lib/date";
import { Lightbox } from "@/components/ui/Lightbox";
import { HeartButton } from "@/features/hearts/HeartButton";
import { LikeCount } from "@/features/hearts/LikeCount";
import { ALBUM_HEARTS } from "@/features/hearts/target";
import { ExifLine } from "@/features/photos/ExifLine";
import { AlbumCommentSection } from "@/features/photos/AlbumCommentSection";

export const revalidate = 300;
export const dynamicParams = true; // slug mới chưa pre-render -> render on-demand

export async function generateStaticParams() {
  const slugs = await getAlbumSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return {};
  const cover = albumCover(album);
  const title = album.title || "Album";
  const description = [album.place, album.description].filter(Boolean).join(" · ").slice(0, 200) || undefined;
  const images = cover ? [photoPublicUrl(cover.path)] : undefined;
  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: { canonical: `/anh/${slug}` },
    openGraph: { title, description, type: "article", url: `/anh/${slug}`, ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // Next 16: params async
  const album = await getAlbum(slug);
  if (!album) notFound();
  const initialComments = await listAlbumComments(createPublicClient(), album.id);
  const title = album.title || "Album";

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <Link href="/anh" className="text-sm text-text-muted hover:text-text">← Ảnh</Link>

      <article className="mt-6 flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-serif text-[1.7rem] leading-[1.35] text-text">{title}</h1>
          <p className="text-sm text-text-muted">
            {[album.place, album.shotOn ? formatPostDate(album.shotOn) : null, `${album.photoCount} ảnh`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {album.description && (
            <p className="mt-2 whitespace-pre-wrap font-serif leading-relaxed text-text">{album.description}</p>
          )}
        </header>

        {/* Mỗi ảnh: tỉ lệ THẬT, lightbox (URL Storage thẳng, 0 transform), caption, EXIF. */}
        <div className="flex flex-col gap-8">
          {album.photos.map((p, i) => (
            <figure key={p.id} className="flex flex-col gap-2">
              <Lightbox
                src={photoPublicUrl(p.path)}
                alt={p.alt || `${title} (ảnh ${i + 1})`}
                sizes="(max-width: 600px) 100vw, 600px"
                blurDataURL={p.blurDataURL ?? undefined}
                ratio={p.w && p.h ? p.w / p.h : undefined}
                priority={i === 0}
              />
              {(p.caption || exifHas(p)) && (
                <figcaption className="flex flex-col gap-1">
                  {p.caption && <p className="text-[14px] leading-snug text-text">{p.caption}</p>}
                  <ExifLine photo={p} />
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <div className="-ml-2.5 flex items-center">
            <HeartButton target={ALBUM_HEARTS} id={album.id} label={title} />
          </div>
          <LikeCount target={ALBUM_HEARTS} id={album.id} serverCount={album.heartCount} />
        </div>
      </article>

      <AlbumCommentSection albumId={album.id} authorId={album.authorId} initialComments={initialComments} />
    </main>
  );
}

function exifHas(p: { focalLength: number | null; aperture: number | null; shutter: string | null; iso: number | null; camera: string | null; lens: string | null; takenAt: string | null }) {
  return p.focalLength !== null || p.aperture !== null || !!p.shutter || p.iso !== null || !!p.camera || !!p.lens || !!p.takenAt;
}
