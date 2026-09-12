// exifr 7.1.3 chỉ khai kiểu cho entry chính (full). Bản lite (TIFF+GPS+XMP, 12KB gzip)
// dùng cùng API; khai lại subpath để TS chấp nhận. Chỉ dùng `parse`.
declare module "exifr/dist/lite.esm.mjs" {
  export function parse(
    input: Blob | ArrayBuffer | Uint8Array | string,
    options?: string[] | { pick?: string[]; translateKeys?: boolean; reviveValues?: boolean },
  ): Promise<Record<string, unknown> | undefined>;
  const _default: { parse: typeof parse };
  export default _default;
}
