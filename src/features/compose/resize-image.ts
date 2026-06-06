// Resize ảnh phía client trước khi upload (giảm dung lượng, né bodySizeLimit).
export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
  blurDataURL: string; // preview ~16px (blur-up, chống CLS) — lưu kèm media
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

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) throw new Error("Resize ảnh thất bại");

  return { blob, width, height, blurDataURL: makeBlurDataURL(canvas, width, height) };
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
