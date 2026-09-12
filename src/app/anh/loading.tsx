import { Skeleton } from "@/components/ui/Skeleton";

// Chờ /anh: lưới skeleton tĩnh (KHÔNG spinner).
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <Skeleton className="mb-4 h-7 w-16 rounded" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-sm" />
        ))}
      </div>
    </main>
  );
}
