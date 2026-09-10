import type { Metadata } from "next";
import Link from "next/link";

// Trang tĩnh thuần — không đọc DB nên không cần revalidate.
export const metadata: Metadata = {
  title: "Giới thiệu — khoảnh khắc của tôi",
  description: "Vài dòng về nơi này và người viết.",
};

export default function GioiThieuPage() {
  return (
    <main className="mx-auto w-full max-w-container px-4.5 py-12">
      <h1 className="font-serif text-2xl font-medium text-text">Giới thiệu</h1>

      {/* TODO(chủ nhà): thay 2 đoạn dưới bằng lời của bạn (bút danh + vì sao có nơi này).
          Giữ nguyên tinh thần: không theo dõi, không donate, không affiliate. */}
      <div className="mt-6 flex flex-col gap-4 font-serif text-text">
        <p>
          Đây là một khoảng lặng riêng — nơi mình ghi lại ảnh, đôi dòng và những
          gì đã đọc, theo tâm trạng của ngày hôm đó.
        </p>
        <p className="text-text-muted">
          Không có lượt theo dõi, không có bảng xếp hạng, cũng không có quảng
          cáo. Bạn ghé đọc, thấy đồng cảm thì để lại một nhịp tim lặng hoặc đôi
          lời — vậy là đủ.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/" className="text-text-muted transition-colors hover:text-text">
          ← Về Feed
        </Link>
        <Link href="/lich" className="text-accent-text hover:underline">
          Lịch cảm xúc
        </Link>
      </div>
    </main>
  );
}
