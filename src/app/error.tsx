"use client";

// Ranh giới lỗi App Router (client). Giọng "Lặng mát" — KHÔNG màn xám framework.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-container flex-col items-center justify-center gap-5 px-4.5 text-center">
      <p
        className="text-lg text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Có gì đó chưa ổn. Mình thở một nhịp rồi thử lại nhé.
      </p>
      <button
        onClick={reset}
        className="rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
      >
        Thử lại
      </button>
    </main>
  );
}
