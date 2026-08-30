-- 0010: Bộ đếm tim CÔNG KHAI (redesign "Nguyên bản" — feed kiểu IG sơ khai).
--
-- Chỉ lộ TỔNG SỐ — anon_id (danh tính người thả) KHÔNG bao giờ lộ:
-- không mở SELECT trên bảng hearts (mở row-SELECT sẽ lộ anon_id; column-revoke
-- không trừ được table-grant, revoke hết thì vỡ removeHeart cần filter anon_id).
-- Thay vào đó: view aggregate chạy quyền owner (security_invoker=off) — vượt RLS
-- hearts CÓ CHỦ ĐÍCH, chỉ đếm bài đã publish.
--
-- Supabase linter sẽ cảnh báo security-definer view — chấp nhận: chỉ lộ aggregate.
-- Trade-off chấp nhận: hearts_anon_insert check(true) + số công khai = có thể
-- bơm số ảo; blog cá nhân, vanity metric.

create view public.heart_counts
  with (security_invoker = off) as
  select h.post_id, count(*)::int as heart_count
  from public.hearts h
  where exists (
    select 1 from public.posts p
    where p.id = h.post_id and p.is_published
  )
  group by h.post_id;

grant select on public.heart_counts to anon, authenticated;
