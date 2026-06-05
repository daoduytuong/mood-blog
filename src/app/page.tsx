// Trang chủ skeleton (Story 1.1). Feed thật sẽ thay thế ở Story 2.1.
export default function Home() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-container px-4.5 py-24 sm:px-6">
      <h1
        className="text-3xl font-medium tracking-tight text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        khoảnh khắc của tôi
      </h1>
      <p className="mt-3 max-w-prose text-text-muted">
        Một khoảng lặng để ghi lại ảnh, nhạc và câu chuyện theo tâm trạng.
      </p>

      {/* Dải xem trước 6 sắc màu tâm trạng — xác nhận token "Lặng mát" hoạt động */}
      <div className="mt-10 flex flex-wrap gap-3" aria-hidden="true">
        <span className="h-6 w-6 rounded-full bg-mood-hoai-niem" />
        <span className="h-6 w-6 rounded-full bg-mood-binh-yen" />
        <span className="h-6 w-6 rounded-full bg-mood-vui" />
        <span className="h-6 w-6 rounded-full bg-mood-buon" />
        <span className="h-6 w-6 rounded-full bg-mood-tram-tu" />
        <span className="h-6 w-6 rounded-full bg-mood-co-don" />
      </div>
    </main>
  );
}
