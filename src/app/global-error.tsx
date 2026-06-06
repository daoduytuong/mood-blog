"use client";

// Lỗi ở chính root layout -> global-error thay cả layout (phải tự render html/body).
// CSS token có thể chưa chắc nạp -> style nội tuyến theo tông "Lặng mát".
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          background: "#F2F6F8",
          color: "#3E4A53",
          fontFamily: "Georgia, 'Times New Roman', serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <p style={{ fontSize: "1.125rem" }}>
          Có gì đó chưa ổn. Mình thở một nhịp rồi thử lại nhé.
        </p>
        <button
          onClick={reset}
          style={{
            border: "1px solid #D7E0E6",
            borderRadius: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            color: "#6B7A85",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Thử lại
        </button>
      </body>
    </html>
  );
}
