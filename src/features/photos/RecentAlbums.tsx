import Link from "next/link";
import { getRecentAlbums } from "./queries";
import { AlbumCard } from "./AlbumCard";

/**
 * Dải "Ảnh mới" trên trang chủ: 4 bìa album mới nhất, đặt TRÊN FeedList.
 * Server component đọc query riêng — FeedList/loadMorePosts/getFreshFeed không đổi.
 * Chưa có album thì KHÔNG render gì (tinh thần DraftList/MemoriesSection).
 */
export async function RecentAlbums() {
  const albums = await getRecentAlbums(4);
  if (albums.length === 0) return null;

  return (
    <section aria-labelledby="recent-albums" className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="recent-albums" className="text-sm font-medium text-text-muted">
          Ảnh mới
        </h2>
        <Link href="/anh" className="text-[13px] text-accent-text hover:underline">
          Xem tất cả
        </Link>
      </div>
      <ul className="grid grid-cols-4 gap-2">
        {albums.map((a) => (
          <li key={a.id}>
            <AlbumCard album={a} mode="grid" sizes="120px" />
          </li>
        ))}
      </ul>
    </section>
  );
}
