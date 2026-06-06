import { ImageResponse } from "next/og";

// Mark "k" (khoảnh khắc) trên nền accent — dùng cho favicon / apple-icon / manifest.
// Ký tự ASCII nên KHÔNG cần nhúng font Việt. Màu thương hiệu (không phải màu mood).
export function brandIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6FA3B8",
          color: "#FFFFFF",
          fontSize: Math.round(size * 0.62),
          fontWeight: 600,
        }}
      >
        k
      </div>
    ),
    { width: size, height: size },
  );
}
