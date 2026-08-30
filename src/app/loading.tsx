import { PostCardSkeleton } from "@/components/ui/Skeleton";

// Trạng thái chờ Feed: skeleton tĩnh (KHÔNG spinner). Story 1.9 mở rộng error/not-found.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-4 sm:py-8">
      <div className="-mx-4.5 flex flex-col gap-3 sm:mx-0 sm:gap-6">
        {[0, 1, 2].map((i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
