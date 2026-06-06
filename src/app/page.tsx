import { getFeedPosts } from "@/features/feed/queries";
import { PostCard } from "@/components/post/PostCard";

// Feed công khai: đọc-nhiều, tĩnh + ISR (client không-cookie giữ static).
export const revalidate = 300;

export default async function Home() {
  const posts = await getFeedPosts();

  if (posts.length === 0) {
    return (
      <main className="mx-auto w-full max-w-container px-4.5 py-24">
        <p
          className="text-text-muted"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Chưa có gì ở đây. Khi nào rảnh, ghi lại một khoảnh khắc nhé.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <div className="flex flex-col gap-6">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} priority={i === 0} />
        ))}
      </div>
    </main>
  );
}
