import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { countPosts } from "@/lib/db/posts";

// Story 1.8 — keepalive: chạy 1 query THẬT (count posts) để Supabase Free không ngủ
// sau 7 ngày. force-dynamic + no-store: KHÔNG cache, mỗi lần gọi là một query thật.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  // Bảo vệ tuỳ chọn: nếu đặt CRON_SECRET (Vercel Cron tự gửi Authorization: Bearer),
  // yêu cầu khớp; chưa đặt -> cho phép (vẫn chạy được khi chưa cấu hình).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const count = await countPosts(createPublicClient());
    return NextResponse.json(
      { ok: true, count },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
