import Image from "next/image";

export interface ImageBlurProps {
  src: string;
  alt: string;
  sizes: string;
  blurDataURL?: string;
  /** Tailwind aspect class — khung cố định chống CLS (mặc định 4/3). */
  aspect?: string;
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
  priority = false,
}: ImageBlurProps) {
  return (
    <div className={`relative w-full overflow-hidden bg-border/40 ${aspect}`}>
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
