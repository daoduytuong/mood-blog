import { getFeedPage } from "@/features/feed/queries";
import { FeedList } from "@/features/feed/FeedList";

// Feed công khai: đọc-nhiều, tĩnh + ISR (client không-cookie giữ static).
export const revalidate = 300;

const PAGE_SIZE = 10;

export default async function Home() {
  const posts = await getFeedPage(PAGE_SIZE);

  if (posts.length === 0) {
    return (
      <main className="mx-auto w-full max-w-container px-4.5 py-24">
        <p className="font-serif text-text-muted">
          Chưa có gì ở đây. Khi nào rảnh, ghi lại một khoảnh khắc nhé.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <FeedList initial={posts} pageSize={PAGE_SIZE} />
    </main>
  );
}
