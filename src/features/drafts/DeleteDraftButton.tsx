"use client";

import { deletePostAction } from "@/features/compose/actions";
import { Button } from "@/components/ui/Button";

// Nháp là việc đang dở — xoá nhầm mất trắng (kể cả ảnh trên Storage), nên hỏi
// lại giống nút xoá bài đã đăng (PostAuthorActions). Mỗi nút còn cần tên riêng
// (aria-label) vì DraftList xếp nhiều nút "Xoá" giống hệt nhau theo hàng.
export function DeleteDraftButton({ id, title }: { id: string; title: string }) {
  return (
    <form action={deletePostAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="danger"
        size="sm"
        aria-label={`Xoá nháp: ${title}`}
        onClick={(e) => {
          if (!window.confirm("Xoá nháp này? Hành động không hoàn tác được nhé."))
            e.preventDefault();
        }}
      >
        Xoá
      </Button>
    </form>
  );
}
