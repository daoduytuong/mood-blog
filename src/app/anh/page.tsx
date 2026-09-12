import type { Metadata } from "next";
import { getAlbums } from "@/features/photos/queries";
import { AlbumGrid } from "@/features/photos/AlbumGrid";

// Công khai, tĩnh + ISR như feed (public client, không cookie). Mode xem = state client.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Ảnh — khoảnh khắc của tôi",
  description: "Album ảnh chụp bằng máy ảnh, kèm thông số và địa điểm.",
};

export default async function AlbumsPage() {
  const albums = await getAlbums();
  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <h1 className="mb-4 font-serif text-2xl font-medium text-text">Ảnh</h1>
      {albums.length === 0 ? (
        <p className="py-16 font-serif text-text-muted">Chưa có album nào.</p>
      ) : (
        <AlbumGrid albums={albums} />
      )}
    </main>
  );
}
