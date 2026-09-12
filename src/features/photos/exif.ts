// Đọc EXIF phía client, chạy TRƯỚC resizeImage(): canvas re-encode xoá sạch
// metadata (kể cả GPS — lợi phụ: không phát toạ độ ra internet).
// Không bao giờ throw: ảnh scan/crop qua app/export sai mất metadata thì trả null hết.
import { parse } from "exifr/dist/lite.esm.mjs";

export interface PhotoExif {
  camera: string | null; // "Fujifilm X-T5"
  lens: string | null; // "XF 35mm F1.4 R"
  focalLength: number | null; // 35
  aperture: number | null; // 1.4
  shutter: string | null; // "1/250" hoặc "2s"
  iso: number | null;
  takenAt: string | null; // ISO string; tz = trình duyệt tác giả (hạn chế đã biết)
}

const EMPTY: PhotoExif = {
  camera: null,
  lens: null,
  focalLength: null,
  aperture: null,
  shutter: null,
  iso: null,
  takenAt: null,
};

const PICK = ["Make", "Model", "LensModel", "FocalLength", "FNumber", "ExposureTime", "ISO", "DateTimeOriginal"];

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** "Fujifilm" + "X-T5" -> "Fujifilm X-T5"; Model đã chứa Make (Canon) -> không lặp. */
function cameraName(make: unknown, model: unknown): string | null {
  const mk = str(make);
  const md = str(model);
  if (!md) return mk;
  if (!mk || md.toLowerCase().startsWith(mk.toLowerCase())) return md;
  return `${mk} ${md}`;
}

/** 0.004 -> "1/250"; 2.5 -> "2.5s"; 1 -> "1s". */
function shutterLabel(t: unknown): string | null {
  const s = num(t);
  if (s === null || s <= 0) return null;
  if (s >= 1) return `${Number(s.toFixed(1))}s`;
  return `1/${Math.round(1 / s)}`;
}

export async function readExif(file: File): Promise<PhotoExif> {
  try {
    const tags = await parse(file, PICK);
    if (!tags) return EMPTY;
    const taken = tags.DateTimeOriginal;
    const focal = num(tags.FocalLength);
    const f = num(tags.FNumber);
    return {
      camera: cameraName(tags.Make, tags.Model),
      lens: str(tags.LensModel),
      focalLength: focal === null ? null : Math.round(focal),
      aperture: f === null ? null : Number(f.toFixed(1)),
      shutter: shutterLabel(tags.ExposureTime),
      iso: num(tags.ISO),
      takenAt:
        taken instanceof Date && !Number.isNaN(taken.getTime())
          ? taken.toISOString()
          : null,
    };
  } catch {
    return EMPTY;
  }
}

/** Dòng ngắn dưới ảnh: "35mm · f/1.8 · 1/250 · ISO 200". Rỗng nếu không có gì. */
export function exifLine(p: {
  focalLength: number | null;
  aperture: number | null;
  shutter: string | null;
  iso: number | null;
}): string {
  return [
    p.focalLength !== null ? `${p.focalLength}mm` : null,
    p.aperture !== null ? `f/${p.aperture}` : null,
    p.shutter,
    p.iso !== null ? `ISO ${p.iso}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
