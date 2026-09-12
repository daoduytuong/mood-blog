import type { Photo } from "@/lib/db/albums";
import { exifLine } from "./exif";

/**
 * Dòng EXIF ngắn dưới ảnh; bấm mới bung khối đầy đủ. `<details>` thuần HTML —
 * không JS, không state; bung/thu là bố cục do người dùng chủ động, không phải animation.
 */
export function ExifLine({ photo }: { photo: Photo }) {
  const line = exifLine(photo);
  const full = [
    photo.camera && ["Máy", photo.camera],
    photo.lens && ["Ống kính", photo.lens],
    photo.takenAt && [
      "Chụp lúc",
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(photo.takenAt)),
    ],
  ].filter((x): x is [string, string] => Array.isArray(x));

  if (!line && full.length === 0) return null;
  if (full.length === 0) return <p className="text-[11px] text-text-muted">{line}</p>;

  return (
    <details className="group text-[11px] text-text-muted">
      <summary className="cursor-pointer list-none hover:text-text [&::-webkit-details-marker]:hidden">
        {line || "Thông số chụp"}
        <span aria-hidden className="ml-1 group-open:hidden">›</span>
        <span aria-hidden className="ml-1 hidden group-open:inline">‹</span>
      </summary>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {full.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-text-muted">{k}</dt>
            <dd className="text-text">{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
