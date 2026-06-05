// Resize ảnh phía client trước khi upload (giảm dung lượng, né bodySizeLimit).
export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
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

  return { blob, width, height };
}
