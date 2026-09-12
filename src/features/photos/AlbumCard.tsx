import Image from "next/image";
import Link from "next/link";
import { photoPublicUrl } from "@/lib/storage";
import { albumCover, type Album } from "@/lib/db/albums";

/**
 * Một ô album. `grid`: bìa vuông + tên + số ảnh. `editorial`: bìa 3:2 + tên +
 * địa điểm + mô tả + 3 ảnh xem trước + link "xem cả N ảnh".
 * Ảnh xem trước render CÓ ĐIỀU KIỆN theo mode (hidden/display:none vẫn tải ảnh).
 */
export function AlbumCard({
  album,
  mode,
  sizes,
  priority = false,
}: {
  album: Album;
  mode: "grid" | "editorial";
  sizes: string;
  priority?: boolean;
}) {
  const cover = albumCover(album);
  const href = `/anh/${album.slug}`;
  const title = album.title || "Album";
  const preview = album.photos.filter((p) => p.id !== cover?.id).slice(0, 3);

  if (mode === "grid") {
    return (
      <Link href={href} className="group flex flex-col gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <div className="relative aspect-square overflow-hidden rounded-sm border border-border bg-border/40 transition-colors group-hover:border-accent">
          {cover && (
            <Image
              src={photoPublicUrl(cover.path)}
              alt={cover.alt || title}
              fill
              sizes={sizes}
              priority={priority}
              placeholder={cover.blurDataURL ? "blur" : "empty"}
              blurDataURL={cover.blurDataURL ?? undefined}
              className="object-cover"
            />
          )}
        </div>
        <p className="line-clamp-1 text-[13px] text-text">{title}</p>
        <p className="text-[11px] text-text-muted">{album.photoCount} ảnh</p>
      </Link>
    );
  }

  return (
    <article className="overflow-hidden rounded-sm border border-border bg-surface">
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
        <div className="relative aspect-[3/2] w-full bg-border/40">
          {cover && (
            <Image
              src={photoPublicUrl(cover.path)}
              alt={cover.alt || title}
              fill
              sizes={sizes}
              priority={priority}
              placeholder={cover.blurDataURL ? "blur" : "empty"}
              blurDataURL={cover.blurDataURL ?? undefined}
              className="object-cover"
            />
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-2 p-3">
        <Link href={href} className="font-serif text-lg text-text hover:underline">{title}</Link>
        {album.place && <p className="text-[13px] text-text-muted">{album.place}</p>}
        {album.description && (
          <p className="line-clamp-3 text-[14px] leading-snug text-text">{album.description}</p>
        )}
        {preview.length > 0 && (
          <ul className="flex gap-1.5">
            {preview.map((p) => (
              <li key={p.id} className="relative h-[72px] w-[72px] overflow-hidden rounded-sm bg-border/40">
                <Image src={photoPublicUrl(p.path)} alt="" fill sizes="100px" className="object-cover" />
              </li>
            ))}
          </ul>
        )}
        <Link href={href} className="self-start text-[13px] text-accent-text hover:underline">
          Xem cả {album.photoCount} ảnh
        </Link>
      </div>
    </article>
  );
}
