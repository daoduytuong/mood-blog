// Skeleton TĨNH (mờ dần — KHÔNG spinner quay), tôn trọng prefers-reduced-motion.
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`bg-border/40 motion-safe:animate-pulse ${className}`}
    />
  );
}

// Khung chờ một thẻ bài — khớp bố cục PostCard để không "giật" khi nội dung vào.
export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <Skeleton className="aspect-4/3 w-full" />
      <div className="flex flex-col gap-3 p-5 pl-6">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}
