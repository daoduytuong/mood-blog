// Card "Nguyên bản": trắng, viền 1px kiểu IG sơ khai.
// Mobile: full-bleed (chỉ viền trên/dưới); từ sm: hộp có viền 4 cạnh + bo nhẹ.
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden border-y border-border bg-surface sm:rounded-sm sm:border-x ${className}`}
    >
      {children}
    </div>
  );
}
