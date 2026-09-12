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
- Map tâm trạng → **CHỈ** qua `src/lib/moods.ts` (nhãn, màu, `moodPath()`, `moodFromSlug()`).
- Route App Router ở `src/app`. Định danh code/route **tiếng Anh**; nội dung hiển thị **tiếng Việt**.
  (Ngoại lệ đã có: route công khai đặt tiếng Việt cho người đọc — `/tam-trang/[mood]`, `/lich`, `/gioi-thieu`.)
- Nút/ô nhập/chip → **dùng primitive** `components/ui/{Button,Input,Textarea,Field,Chip}`,
  KHÔNG viết lại chuỗi class. Kích cỡ/biến thể đi qua **prop**, không chồng qua
  `className`: hai utility cùng thuộc tính (`py-2` vs `py-1.5`, `rounded-md` vs
  `rounded-sm`) tranh nhau theo thứ tự file CSS sinh ra, không theo thứ tự trong JSX.
- Màu accent: chữ/icon dùng `text-accent-text`, nền/viền dùng `accent`.
  `#3897F0` chỉ đạt 3.06:1 trên nền linen → KHÔNG dùng làm màu chữ.

## Bất biến (KHÔNG được phá)
- `src/lib/moods.ts` là **chân lý** mã→nhãn→màu. KHÔNG hardcode hex màu tâm trạng nơi khác (luôn qua token `@theme` — design system **"Nguyên bản"**: phong cách Instagram sơ khai, nền linen `#FAFAFA`, card trắng viền 1px `--color-border`, accent xanh `#3897F0`, tim đỏ `--color-like`, wordmark Lobster; có light + dark; token hiện hành ở `globals.css` — DESIGN.md trong `_bmad-output` mô tả hệ "Ấn bản" CŨ). Ngoại lệ DUY NHẤT được hardcode hex: icon/OG (`brand-icon.tsx`, `opengraph-image.tsx`) vì next/og không đọc CSS token.
- **Tim vẫn ẩn danh**: `anon_id` (danh tính người thả) KHÔNG bao giờ public — tổng số công khai CHỈ qua view `heart_counts` (migration 0010, chỉ lộ aggregate); KHÔNG mở SELECT trên bảng `hearts` cho anon. Double-tap-to-like tồn tại trên media feed (`DoubleTapMedia`, like-only — không unlike).
- Light + dark — toggle qua class `.dark` trên `<html>`; chống FOUC bằng inline script ở `layout.tsx`. KHÔNG spinner quay (dùng skeleton tĩnh / mờ dần). KHÔNG nhạc tự bật. Hover chỉ đổi màu/viền, KHÔNG chuyển động.
- Video: **detail** autoplay MUTED + nút "Bật tiếng"; **feed** chạm-mới-phát INLINE (muted + nút bật tiếng), KHÔNG autoplay-khi-cuộn/Reels. Tôn trọng `prefers-reduced-motion`. KHÔNG autoplay có tiếng.
- KHÔNG import service-role key vào client (dùng `import 'server-only'`).

## Lệnh
`npm run dev` · `npm run build` · `npm run lint`

## Definition of Done (mỗi story)
Lint sạch · build pass · không lộ secret · không phá bất biến · cập nhật File List trong story.

## Tài liệu nguồn (single source of truth)
- Token/typography/primitive: `../_bmad-output/planning-artifacts/ux-designs/nguyen-ban-2026-09-08/DESIGN.md`
  (chân lý runtime vẫn là `globals.css`; DESIGN.md của `ux-personal-2026-06-04` mô tả hệ "Ấn bản" ĐÃ CHẾT)
- Hành vi/flows/states: `.../ux-personal-2026-06-04/EXPERIENCE.md`
- Kiến trúc/quyết định: `../_bmad-output/planning-artifacts/architecture.md`
- Stories: `../_bmad-output/implementation-artifacts/`
