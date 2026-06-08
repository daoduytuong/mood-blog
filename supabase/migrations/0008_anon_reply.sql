-- Mood Blog — Phase-2 Lát 4: Người xem (anon) được TRẢ LỜI bình luận gốc (2 tầng),
-- không chỉ tác giả. Giữ nguyên hardening 0007:
--   - user_id BẮT BUỘC null (không giả danh tác giả — badge "tác giả" là server-truth).
--   - chỉ bình luận lên bài ĐÃ PUBLISH.
--   - parent_id: null (gốc) HOẶC trỏ tới một bình luận GỐC cùng bài (chỉ cho 2 tầng, không reply-của-reply).
-- Trigger rate-limit (0007) vẫn áp cho mọi insert của khách (gồm trả lời).

drop policy if exists comments_anon_insert on comments;
create policy comments_anon_insert on comments
  for insert to anon
  with check (
    user_id is null
    and exists (select 1 from posts p where p.id = post_id and p.is_published)
    and (
      parent_id is null
      or exists (
        select 1 from comments c
        where c.id = parent_id
          and c.post_id = comments.post_id   -- `comments` (không alias) = hàng đang chèn
          and c.parent_id is null            -- parent phải là bình luận GỐC
      )
    )
  );
