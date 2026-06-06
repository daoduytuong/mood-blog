import "server-only";

// Lấy meta video Vimeo qua oEmbed (server-side: né CORS, giấu logic, validate trước khi lưu).
// KHÔNG tự host video — chỉ lưu provider + video_id + poster_url (giữ $0 bandwidth).
export interface VimeoMeta {
  videoId: string;
  posterUrl?: string;
}

// Chuẩn hoá input (link đầy đủ / player.vimeo.com / ID trần) -> URL vimeo hợp lệ cho oEmbed.
// Giữ nguyên link gốc để hỗ trợ video unlisted dạng vimeo.com/{id}/{hash}.
function toVimeoUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return `https://vimeo.com/${s}`; // ID trần
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    const ok =
      host === "vimeo.com" ||
      host.endsWith(".vimeo.com") ||
      host === "player.vimeo.com";
    return ok ? s : null;
  } catch {
    return null;
  }
}

export async function fetchVimeoMeta(input: string): Promise<VimeoMeta | null> {
  const url = toVimeoUrl(input);
  if (!url) return null;

  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}&dnt=1`;
  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null; // 404/403 -> private/không tồn tại

    const data: unknown = await res.json();
    if (typeof data !== "object" || data === null) return null;
    const obj = data as Record<string, unknown>;

    const rawId = obj.video_id;
    const videoId =
      typeof rawId === "number" || typeof rawId === "string"
        ? String(rawId)
        : null;
    if (!videoId || !/^\d+$/.test(videoId)) return null;

    const posterUrl =
      typeof obj.thumbnail_url === "string" ? obj.thumbnail_url : undefined;

    return { videoId, posterUrl };
  } catch {
    return null; // mạng lỗi / timeout / JSON hỏng -> coi như không hợp lệ
  }
}
