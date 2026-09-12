import { getFeedPage } from "@/features/feed/queries";
import { FeedList } from "@/features/feed/FeedList";
import { MoodFilterChips } from "@/components/post/MoodFilterChips";
import { RecentAlbums } from "@/features/photos/RecentAlbums";

// Feed công khai: đọc-nhiều, tĩnh + ISR (client không-cookie giữ static).
export const revalidate = 300;

const PAGE_SIZE = 10;

export default async function Home() {
  const posts = await getFeedPage(PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-4 sm:py-8">
      <MoodFilterChips />
      {/* Dải "Ảnh mới" nằm ngoài nhánh rỗng của feed: có album mà chưa có bài vẫn hiện. */}
      <RecentAlbums />
      {posts.length === 0 ? (
        <p className="py-16 font-serif text-text-muted">
          Chưa có gì ở đây. Khi nào rảnh, ghi lại một khoảnh khắc nhé.
        </p>
      ) : (
        <FeedList initial={posts} pageSize={PAGE_SIZE} />
      )}
    </main>
  );
}
