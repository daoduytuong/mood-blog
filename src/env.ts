import { z } from "zod";

// Validate biến môi trường công khai — fail-fast lúc build nếu thiếu/sai.
// Chỉ liệt kê biến NEXT_PUBLIC_* (an toàn cho client; Next chỉ inline biến được tham chiếu).
// SUPABASE_SERVICE_ROLE_KEY (nếu cần sau) chỉ đọc trong file `import 'server-only'`.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
