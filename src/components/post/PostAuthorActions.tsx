"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { deletePostAction } from "@/features/compose/actions";

// Story 1.7 — điều khiển sửa/xoá CHỈ hiện cho Tác giả. Kiểm session phía client
// để trang chi tiết vẫn SSG/ISR (không cookies). RLS + action vẫn chặn server-side.
export function PostAuthorActions({
  postId,
  slug,
}: {
  postId: string;
  slug: string;
}) {
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
    <div className="mt-6 flex items-center gap-4 border-t border-border pt-4 text-sm">
      <Link
        href={`/m/${slug}/edit`}
        className="text-text-muted hover:text-text"
      >
        Sửa
      </Link>
      <form action={deletePostAction}>
        <input type="hidden" name="id" value={postId} />
        <input type="hidden" name="slug" value={slug} />
        <button
          type="submit"
          onClick={(e) => {
            if (
              !window.confirm("Xoá bài này? Hành động không hoàn tác được nhé.")
            )
              e.preventDefault();
          }}
          className="text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
        >
          Xoá
        </button>
      </form>
    </div>
  );
}
