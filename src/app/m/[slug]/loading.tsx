import { Skeleton } from "@/components/ui/Skeleton";

// Chờ trang chi tiết: skeleton tĩnh khớp bố cục bài (KHÔNG spinner).
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <Skeleton className="h-4 w-20 rounded" />
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        <Skeleton className="aspect-4/3 w-full" />
        <div className="flex flex-col gap-3 p-6 pl-7">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      </div>
    </main>
  );
}
