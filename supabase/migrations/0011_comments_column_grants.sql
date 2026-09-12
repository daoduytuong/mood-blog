-- Mood Blog — 0011: sửa hardening 0007 KHÔNG có hiệu lực.
--
-- 0007 làm `revoke select (anon_id) on comments from anon, authenticated`, nhưng
-- Supabase cấp SELECT ở CẤP BẢNG cho anon/authenticated qua default ACL, và
-- Postgres bỏ qua revoke cấp cột khi grant cấp bảng vẫn còn (tài liệu REVOKE:
-- "if a role has been granted privileges on a table, then revoking the same
-- privileges from individual columns will have no effect").
-- Kiểm 2026-09-12: has_column_privilege('anon','public.comments','anon_id','SELECT') = true.
--
-- Cách đúng: rút SELECT cấp bảng, rồi cấp lại ĐÚNG danh sách cột công khai
-- (khớp COLS trong src/lib/db/comments.ts). Grant cấp cột vẫn cho count(*)
-- chạy (đã test) -> embed `comments(count)` ở src/lib/db/posts.ts không gãy.
-- Cột mới sau này KHÔNG tự công khai — phải grant tường minh. Đó là điều muốn.

revoke select on public.comments from anon, authenticated;
grant select (id, post_id, parent_id, user_id, author_name, body, mood, is_hidden, created_at)
  on public.comments to anon, authenticated;

-- Hàm trigger không phải để gọi qua RPC; rút EXECUTE cho linter sạch
-- (trigger vẫn chạy vì được gọi bởi hệ thống, không qua quyền của caller).
revoke execute on function public.comments_rate_limit() from public, anon, authenticated;
