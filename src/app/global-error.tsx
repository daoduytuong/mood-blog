"use client";

// Lỗi ở CHÍNH root layout -> global-error thay cả layout (phải tự render html/body),
// và không chắc globals.css đã nạp -> phải tự mang màu theo.
//
// Vì layout (kèm inline script đặt class .dark) không tồn tại ở đây, tín hiệu tối/sáng
// duy nhất còn lại là `prefers-color-scheme` — không đọc được lựa chọn thủ công trong
// localStorage. Chấp nhận: đây là màn hình sập, hiếm và không tương tác lâu.
// Style nội tuyến KHÔNG hỗ trợ media query -> phải dùng <style> + class.
const CSS = `
  .mb-crash {
    margin: 0; min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1.25rem;
    padding: 1.5rem; text-align: center;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #FAFAFA; color: #262626;
  }
  .mb-crash-btn {
    min-height: 44px; padding: 0.5rem 1.25rem;
    border: 1px solid #DBDBDB; border-radius: 0.25rem;
    background: #FFFFFF; color: #262626;
    font: inherit; font-size: 0.875rem; cursor: pointer;
  }
  .mb-crash-btn:hover { border-color: #3897F0; color: #3897F0; }
  @media (prefers-color-scheme: dark) {
    .mb-crash { background: #0E0E0E; color: #F1F1F1; }
    .mb-crash-btn { border-color: #2E2E2E; background: #1A1A1A; color: #F1F1F1; }
    .mb-crash-btn:hover { border-color: #4DA3F5; color: #4DA3F5; }
  }
`;

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="vi">
      <body className="mb-crash">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <p style={{ fontSize: "1.0625rem" }}>
          Có gì đó chưa ổn. Mình thở một nhịp rồi thử lại nhé.
        </p>
        <button type="button" onClick={reset} className="mb-crash-btn">
          Thử lại
        </button>
      </body>
    </html>
  );
}
