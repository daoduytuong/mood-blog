import { PostCardSkeleton } from "@/components/ui/Skeleton";

// Trạng thái chờ Feed: skeleton tĩnh (KHÔNG spinner). Story 1.9 mở rộng error/not-found.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <div className="flex flex-col gap-6">
        {[0, 1, 2].map((i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
