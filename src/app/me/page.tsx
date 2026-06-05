import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";

// Author-only, dynamic (đọc session). Tổng tim mỗi bài sẽ thêm ở Story 3.3.
export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Double-check server-side (proxy đã guard, nhưng không tin mỗi proxy).
  if (!user) redirect("/login?returnTo=/me");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-container px-4.5 py-16">
      <h1
        className="text-2xl font-medium text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Trang của bạn
      </h1>
      <p className="mt-3 text-text-muted">
        Đây là không gian riêng của bạn. Tổng số tim mỗi bài sẽ hiện ở đây.
      </p>

      <form action={signOut} className="mt-10">
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
        >
          Đăng xuất
        </button>
      </form>
    </main>
  );
}
