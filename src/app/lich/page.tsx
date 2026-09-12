import type { Metadata } from "next";
import Link from "next/link";
import { getMoodStamps } from "@/features/calendar/queries";
import { groupByMonth } from "@/features/calendar/group";
import { MoodCalendar } from "@/features/calendar/MoodCalendar";

// Công khai + tĩnh/ISR như Feed (client không-cookie).
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Lịch cảm xúc — khoảnh khắc của tôi",
  description: "Những ngày đã ghi lại, xếp theo tháng và theo tâm trạng.",
};

export default async function LichPage() {
  const months = groupByMonth(await getMoodStamps());

  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-serif text-2xl font-medium text-text">
          Lịch cảm xúc
        </h1>
        <p className="text-sm text-text-muted">
          Mỗi ô là một ngày có bài. Chạm để mở lại ngày đó.
        </p>
      </div>

      {months.length === 0 ? (
        <p className="py-16 font-serif text-text-muted">
          Chưa có ngày nào được ghi lại.
        </p>
      ) : (
        <MoodCalendar months={months} />
      )}

      <Link
        href="/"
        className="mt-12 inline-block text-sm text-text-muted transition-colors hover:text-text"
      >
        ← Về Feed
      </Link>
    </main>
  );
}
