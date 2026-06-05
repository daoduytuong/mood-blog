"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/features/auth/actions";

// Điều khiển chỉ-Tác-giả ở thanh trên. Kiểm session phía client để KHÔNG
// làm root layout thành dynamic (giữ Feed tĩnh/ISR ở Story 2.1).
export function AuthorNav() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => setAuthed(!!session));
    return () => subscription.unsubscribe();
  }, []);

  if (!authed) return null;

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/compose" className="text-accent">
        Soạn bài
      </Link>
      <Link href="/me" className="text-text-muted hover:text-text">
        Trang của tôi
      </Link>
      <form action={signOut}>
        <button type="submit" className="text-text-muted hover:text-text">
          Đăng xuất
        </button>
      </form>
    </nav>
  );
}
