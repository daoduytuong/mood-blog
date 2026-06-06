import { ImageResponse } from "next/og";

export const alt = "khoảnh khắc của tôi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// OG fallback toàn site (cho Góc đọc/video không có ảnh riêng). Tối giản, font-free
// (mark "k" + vạch accent) — né vụ nhúng font Việt; OG-động giữ deferred.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          background: "#F2F6F8",
          color: "#3E4A53",
        }}
      >
        <div style={{ fontSize: 260, fontWeight: 600, lineHeight: 1 }}>k</div>
        <div
          style={{
            width: 140,
            height: 5,
            borderRadius: 3,
            background: "#6FA3B8",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
