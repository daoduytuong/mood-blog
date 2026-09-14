// Resize ảnh phía client trước khi upload (giảm dung lượng, né bodySizeLimit).
export interface ResizedImage {
  blob: Blob;
  /** Kiểu THẬT của blob — đừng đinh ninh webp, xem ghi chú ở encode() bên dưới. */
  type: "image/webp" | "image/jpeg";
  /** Đuôi khớp `type`, để đặt tên file trong Storage. */
  ext: "webp" | "jpg";
  width: number;
  height: number;
  blurDataURL: string; // preview ~16px (blur-up, chống CLS) — lưu kèm media
}

/**
 * Trần cho một tấm 2048px đã nén CÓ MẤT DỮ LIỆU: thực tế 0.2–0.8 MB.
 * Vượt trần này nghĩa là encoder không nén lossy thật (xem encode()).
 */
const LOSSY_CEILING = 1.5 * 1024 * 1024;

function encode(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function resizeImage(
  file: File,
  maxDim = 2048,
  quality = 0.8,
): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;

  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // canvas.toBlob() KHÔNG báo lỗi khi không nén được kiểu được yêu cầu: theo spec
  // nó lặng lẽ trả png. WebKit (Safari/Edge/Chrome trên iOS) còn một biến thể nữa:
  // trả đúng image/webp nhưng bỏ qua `quality` -> webp KHÔNG mất dữ liệu. Cả hai đều
  // cho ra file gấp cả chục lần (đo thật trên iOS 18.6: 2048×1366 -> 5.26 MB) và
  // chỉ lộ ra ở CỠ FILE, nên kiểm cả kiểu lẫn cỡ rồi rơi về jpeg — jpeg thì trình
  // duyệt nào cũng nén lossy đúng.
  const webp = await encode(canvas, "image/webp", quality);
  let blob = webp?.type === "image/webp" ? webp : null;
  if (!blob || blob.size > LOSSY_CEILING) {
    const jpeg = await encode(canvas, "image/jpeg", quality);
    if (jpeg?.type === "image/jpeg" && (!blob || jpeg.size < blob.size)) blob = jpeg;
  }
  if (!blob) throw new Error("Trình duyệt không nén được ảnh (cả webp lẫn jpeg)");

  const type = blob.type === "image/webp" ? "image/webp" : "image/jpeg";
  return {
    blob,
    type,
    ext: type === "image/webp" ? "webp" : "jpg",
    width,
    height,
    blurDataURL: makeBlurDataURL(canvas, width, height),
  };
}

// Thu nhỏ về ~16px (giữ tỷ lệ) -> data URL tí hon làm placeholder blur cho next/image.
function makeBlurDataURL(
  source: HTMLCanvasElement,
  width: number,
  height: number,
): string {
  const TINY = 16;
  const scale = TINY / Math.max(width, height);
  const tw = Math.max(1, Math.round(width * scale));
  const th = Math.max(1, Math.round(height * scale));

  const tiny = document.createElement("canvas");
  tiny.width = tw;
  tiny.height = th;
  const tctx = tiny.getContext("2d");
  if (!tctx) return "";
  tctx.drawImage(source, 0, 0, tw, th);

  const webp = tiny.toDataURL("image/webp", 0.5);
  // Một số trình duyệt không xuất được webp -> rơi về jpeg.
  return webp.startsWith("data:image/webp")
    ? webp
    : tiny.toDataURL("image/jpeg", 0.5);
}
