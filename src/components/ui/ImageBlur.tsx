import Image from "next/image";

export interface ImageBlurProps {
  src: string;
  alt: string;
  sizes: string;
  blurDataURL?: string;
  /** Tailwind aspect class — khung cố định chống CLS (mặc định 4/3). */
  aspect?: string;
  /** Tỉ lệ ảnh THẬT (w/h) — nếu có, dùng aspect-ratio inline thay class (vd trang chi tiết). */
  ratio?: number;
  priority?: boolean;
}

// Blur-up: khung aspect-ratio CỐ ĐỊNH (không nhảy layout) + ảnh fade từ blur.
// Có blurDataURL (bài mới, lưu từ resize) -> placeholder="blur"; bài cũ -> nền dịu.
export function ImageBlur({
  src,
  alt,
  sizes,
  blurDataURL,
  aspect = "aspect-4/3",
  ratio,
  priority = false,
}: ImageBlurProps) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-border/40 ${ratio ? "" : aspect}`}
      style={ratio ? { aspectRatio: String(ratio) } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
        className="object-cover"
      />
    </div>
  );
}
