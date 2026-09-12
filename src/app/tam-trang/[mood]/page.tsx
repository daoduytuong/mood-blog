import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedList } from "@/features/feed/FeedList";
import { getFeedPage } from "@/features/feed/queries";
import { MoodFilterChips } from "@/components/post/MoodFilterChips";
import { MOODS, MOOD_CODES, moodFromSlug } from "@/lib/moods";

// 6 trang tĩnh + ISR như Feed (KHÔNG dùng ?searchParams — nó biến trang thành
// dynamic, đắt trên Vercel Hobby). URL chia sẻ được và SEO được.
export const revalidate = 300;

const PAGE_SIZE = 10;

export function generateStaticParams() {
  return MOOD_CODES.map((code) => ({ mood: MOODS[code].slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mood: string }>;
}): Promise<Metadata> {
  const { mood: slug } = await params; // Next 16: params là Promise
  const code = moodFromSlug(slug);
  if (!code) return { title: "Không có tâm trạng này" };
  return {
    title: `${MOODS[code].label} — khoảnh khắc của tôi`,
    description: `Những khoảnh khắc mang tâm trạng ${MOODS[code].label}.`,
  };
}

export default async function MoodFeedPage({
  params,
}: {
  params: Promise<{ mood: string }>;
}) {
  const { mood: slug } = await params;
  const code = moodFromSlug(slug);
  if (!code) notFound();

  const posts = await getFeedPage(PAGE_SIZE, undefined, code);

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-4 sm:py-8">
      <MoodFilterChips active={code} />

      {posts.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-16">
          <p className="font-serif text-text-muted">
            Chưa có bài <span className="text-text">{MOODS[code].label}</span>{" "}
            nào. Rồi sẽ có thôi.
          </p>
          <Link href="/" className="text-sm text-accent-text hover:underline">
            ← Xem tất cả
          </Link>
        </div>
      ) : (
        <FeedList initial={posts} pageSize={PAGE_SIZE} mood={code} />
      )}
    </main>
  );
}
