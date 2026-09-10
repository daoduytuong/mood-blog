"use client";

import { Button } from "@/components/ui/Button";

// Ranh giới lỗi App Router (client). Giọng ấm — KHÔNG màn xám framework.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-container flex-col items-center justify-center gap-5 px-4.5 text-center">
      <p
        className="text-lg text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Có gì đó chưa ổn. Mình thở một nhịp rồi thử lại nhé.
      </p>
      <Button variant="quiet" size="sm" onClick={reset}>
        Thử lại
      </Button>
    </main>
  );
}
