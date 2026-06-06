<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mood Blog — Hướng dẫn cho AI agent

## Bẫy hay gặp (Next 16) — heed before coding
- `params` / `searchParams` / `cookies()` / `headers()` / `draftMode()` là **async → phải `await`**.
- `themeColor` thuộc `export const viewport`, **không** thuộc `metadata`.
- `next/image`: dùng `images.remotePatterns` (KHÔNG `images.domains`).
- Quy ước `middleware.ts` → **`proxy.ts`** (dùng ở Story 1.4 auth/session).
- `revalidateTag` đổi chữ ký (cần cacheLife profile) — lưu ý Story 1.7 / 2.x.

## Sản phẩm (1 câu) + ràng buộc
Mood Blog: web blog cảm xúc cá nhân (đăng "Khoảnh khắc" + "Góc đọc" theo tâm trạng; "tim lặng" ẩn danh). **Solo + portfolio, $0, PHI LỢI NHUẬN** (KHÔNG donate/ads/affiliate — vi phạm điều khoản Vercel Hobby). Đừng đề xuất Redis/Kafka/microservice. Tinh thần: **nhẹ-tĩnh-tinh tế**.

## Bản đồ đặt code
- Tính năng mới → `src/features/<tên>` (logic + component theo domain).
- UI dùng chung → `src/components/ui` (primitive) | `src/components/post` (UI bài đăng).
- Gọi Supabase → **CHỈ** qua `src/lib/db`. KHÔNG gọi `supabase.from()` rải rác trong component.
- Map tâm trạng → **CHỈ** qua `src/lib/moods.ts`.
- Route App Router ở `src/app`. Định danh code/route **tiếng Anh**; nội dung hiển thị **tiếng Việt**.

## Bất biến (KHÔNG được phá)
- `src/lib/moods.ts` là **chân lý** mã→nhãn→màu. KHÔNG hardcode hex màu tâm trạng nơi khác (luôn qua token `@theme` "Lặng mát").
- **Tim lặng = ẩn danh**, KHÔNG lưu danh tính người thả; **tổng số CHỈ Tác giả thấy** (enforce ở RLS, không chỉ UI). KHÔNG bộ đếm like công khai.
- Light mode only (v1). KHÔNG spinner quay (dùng skeleton tĩnh / mờ dần). KHÔNG nhạc tự bật.
- Video: ở **detail** được autoplay **MUTED** + nút "Bật tiếng" (unmute qua postMessage, không reload); tôn trọng `prefers-reduced-motion` (bỏ autoplay → chạm-mới-phát). KHÔNG autoplay có tiếng; ở **feed** chỉ poster + icon play, bấm sang detail.
- KHÔNG import service-role key vào client (dùng `import 'server-only'`).

## Lệnh
`npm run dev` · `npm run build` · `npm run lint`

## Definition of Done (mỗi story)
Lint sạch · build pass · không lộ secret · không phá bất biến · cập nhật File List trong story.

## Tài liệu nguồn (single source of truth)
- Token/typography/components: `../_bmad-output/planning-artifacts/ux-designs/ux-personal-2026-06-04/DESIGN.md`
- Hành vi/flows/states: `.../EXPERIENCE.md`
- Kiến trúc/quyết định: `../_bmad-output/planning-artifacts/architecture.md`
- Stories: `../_bmad-output/implementation-artifacts/`
