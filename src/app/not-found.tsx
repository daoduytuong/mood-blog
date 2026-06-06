import Link from "next/link";

// 404 tử tế theo giọng "Lặng mát" (slug sai/bài đã xoá rơi vào đây).
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-container flex-col items-center justify-center gap-5 px-4.5 text-center">
      <p
        className="text-lg text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Trang này không còn ở đây nữa.
      </p>
      <Link
        href="/"
        className="rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
      >
        ← Về Feed
      </Link>
    </main>
  );
}
