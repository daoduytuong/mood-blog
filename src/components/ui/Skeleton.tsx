// Skeleton TĨNH (mờ dần — KHÔNG spinner quay), tôn trọng prefers-reduced-motion.
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`bg-border/40 motion-safe:animate-pulse ${className}`}
    />
  );
}

// Khung chờ một thẻ bài — khớp anatomy PostCard "Nguyên bản" (header avatar,
// ảnh vuông, action row + caption) để không "giật" khi nội dung vào.
export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden border-y border-border bg-surface sm:rounded-sm sm:border-x">
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-2.5 w-14 rounded" />
        </div>
      </div>
      <Skeleton className="aspect-square w-full" />
      <div className="flex flex-col gap-2.5 p-3">
        <Skeleton className="h-6 w-24 rounded" />
        <Skeleton className="h-3.5 w-3/4 rounded" />
      </div>
    </div>
  );
}
