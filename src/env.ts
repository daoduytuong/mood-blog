import { z } from "zod";

// Validate biến môi trường công khai — fail-fast lúc build nếu thiếu/sai.
// Chỉ liệt kê biến NEXT_PUBLIC_* (an toàn cho client; Next chỉ inline biến được tham chiếu).
// SUPABASE_SERVICE_ROLE_KEY (nếu cần sau) chỉ đọc trong file `import 'server-only'`.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Analytics Plausible (Story 2.6) — tuỳ chọn, riêng tư (không cookie, không profiling).
  // Đặt domain CHỈ ở Vercel Production để script không chạy khi dev/preview.
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().min(1).optional(),
  // Nguồn script (đổi khi self-host); để trống = cloud plausible.io mặc định.
  NEXT_PUBLIC_PLAUSIBLE_SRC: z.string().url().optional(),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
  NEXT_PUBLIC_PLAUSIBLE_SRC: process.env.NEXT_PUBLIC_PLAUSIBLE_SRC,
});
