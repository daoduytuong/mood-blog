-- Mood Blog — Phase-2 Lát 2 HARDENING (sau review bảo mật đối kháng).
-- Vá: (1) rò anon_id, (2) khóa cột UPDATE, (3) rate-limit flood theo IP + chỉ bài publish.

-- (1) anon_id là danh tính DÙNG CHUNG với tim (hearts chặn anon SELECT để giữ "tim lặng").
--     KHÔNG để comments làm lộ chính anon_id đó -> chặn truy vết người xem xuyên bài.
revoke select (anon_id) on comments from anon, authenticated;

-- (2) Tác giả moderate CHỈ cần đổi is_hidden -> khóa UPDATE về đúng cột đó
--     (chặn gắn badge "tác giả" giả lên lời khách / sửa body/author_name của khách).
revoke update on comments from authenticated;
grant  update (is_hidden) on comments to authenticated;

-- (3a) Cột IP (ẩn khỏi SELECT công khai) phục vụ rate-limit.
alter table comments add column anon_ip text;
revoke select (anon_ip) on comments from anon, authenticated;

-- (3b) Khách CHỈ bình luận lên bài ĐÃ PUBLISH (vẫn ép user_id null + parent_id null).
drop policy comments_anon_insert on comments;
create policy comments_anon_insert on comments
  for insert to anon
  with check (
    user_id is null
    and parent_id is null
    and exists (select 1 from posts p where p.id = post_id and p.is_published)
  );

-- (3c) Rate-limit flood: trigger BEFORE INSERT cho KHÁCH (user_id null) — ≤5 comment/phút/IP.
--      IP từ header PostgREST (x-forwarded-for) — spoof được nên chỉ là giảm thiểu, không tuyệt đối.
create or replace function comments_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ip text;
  recent int;
begin
  if new.user_id is not null then
    return new; -- tác giả: bỏ qua
  end if;
  ip := split_part(
    coalesce(
      nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for',
      ''
    ),
    ',', 1
  );
  new.anon_ip := nullif(trim(ip), '');
  if new.anon_ip is not null then
    select count(*) into recent
    from comments
    where anon_ip = new.anon_ip
      and created_at > now() - interval '1 minute';
    if recent >= 5 then
      raise exception 'rate_limited' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_comments_rate_limit
  before insert on comments
  for each row execute function comments_rate_limit();
