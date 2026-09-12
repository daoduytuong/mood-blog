-- Mood Blog — 0012: Khu ảnh /anh (spec docs/superpowers/specs/2026-09-12-web-anh-design.md).
-- Bảng RIÊNG, không chạm posts/hearts/comments. Tim + bình luận là bảng gương,
-- giữ nguyên mô hình đã hardened (0007 + 0010 + 0011).

-- ===== ALBUMS =====
create table albums (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references auth.users(id) on delete cascade,
  slug           text unique not null,
  title          text not null default '',          -- nháp được phép trống; Đăng mới bắt buộc
  place          text,                              -- địa điểm dạng CHỮ, không toạ độ
  description    text,
  cover_photo_id uuid,                              -- FK thêm sau khi có bảng photos
  shot_on        date,                              -- ngày CHỤP (khác ngày đăng)
  is_published   boolean not null default false,
  created_at     timestamptz not null default now()
);
create index idx_albums_public on albums (created_at desc) where is_published;

-- ===== PHOTOS =====
create table photos (
  id            uuid primary key default gen_random_uuid(),
  album_id      uuid not null references albums(id) on delete cascade,
  path          text not null,                      -- <user>/<uuid>.webp trong bucket photos
  w             int,
  h             int,
  blur_data_url text,
  alt           text,
  caption       text,
  position      int not null default 0,
  -- EXIF tách cột để query được (spec: "EXIF tách cột, không JSONB")
  camera        text,                               -- "Fujifilm X-T5"
  lens          text,                               -- "XF 35mm F1.4 R"
  focal_length  int,                                -- 35
  aperture      numeric(3,1),                       -- 1.4
  shutter       text,                               -- "1/250"
  iso           int,
  taken_at      timestamptz,                        -- EXIF DateTimeOriginal (tz trình duyệt tác giả)
  created_at    timestamptz not null default now(),
  constraint photo_alt_len check (alt is null or char_length(alt) <= 200),
  constraint photo_caption_len check (caption is null or char_length(caption) <= 500)
);
create index idx_photos_album on photos (album_id, position);

alter table albums
  add constraint albums_cover_fk
  foreign key (cover_photo_id) references photos(id) on delete set null;

-- ===== RLS: albums / photos =====
alter table albums enable row level security;
alter table photos enable row level security;

create policy albums_public_read on albums
  for select using (is_published);
create policy albums_author_all on albums
  for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy photos_public_read on photos
  for select using (
    exists (select 1 from albums a where a.id = photos.album_id and a.is_published)
  );
create policy photos_author_all on photos
  for all
  using (exists (select 1 from albums a where a.id = photos.album_id and a.author_id = auth.uid()))
  with check (exists (select 1 from albums a where a.id = photos.album_id and a.author_id = auth.uid()));

-- ===== ALBUM_HEARTS (gương của hearts, 0002 + 0004) =====
create table album_hearts (
  album_id   uuid not null references albums(id) on delete cascade,
  anon_id    text not null,
  created_at timestamptz not null default now(),
  primary key (album_id, anon_id)
);
alter table album_hearts enable row level security;

-- Khách thả tim CHỈ lên album đã publish; KHÔNG SELECT bảng (giữ anon_id kín).
create policy album_hearts_anon_insert on album_hearts
  for insert
  with check (exists (select 1 from albums a where a.id = album_id and a.is_published));
-- Gỡ tim: anon_id không đọc được nên chỉ xoá được dòng mình biết (như 0004).
create policy album_hearts_anon_delete on album_hearts
  for delete to anon, authenticated
  using (true);
create policy album_hearts_author_read on album_hearts
  for select
  using (exists (select 1 from albums a where a.id = album_hearts.album_id and a.author_id = auth.uid()));

-- Tổng tim CÔNG KHAI: view chạy quyền owner, chỉ lộ aggregate (khuôn 0010).
create view public.album_heart_counts
  with (security_invoker = off) as
  select h.album_id, count(*)::int as heart_count
  from public.album_hearts h
  where exists (select 1 from public.albums a where a.id = h.album_id and a.is_published)
  group by h.album_id;
grant select on public.album_heart_counts to anon, authenticated;

-- ===== ALBUM_COMMENTS (gương của comments 0005 + 0007 + 0008 + 0011, KHÔNG mood) =====
create table album_comments (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references albums(id) on delete cascade,
  parent_id   uuid references album_comments(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  anon_id     text,
  anon_ip     text,
  author_name text not null,
  body        text not null,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint album_comment_body_len check (char_length(body) between 1 and 500),
  constraint album_comment_name_len check (char_length(author_name) between 1 and 40)
);
create index idx_album_comments_album on album_comments (album_id, created_at);
create index idx_album_comments_parent on album_comments (parent_id);
alter table album_comments enable row level security;

create policy album_comments_public_read on album_comments
  for select using (is_hidden = false);

-- Khách: user_id null, chỉ album đã publish, reply 2 tầng (parent phải là gốc cùng album).
create policy album_comments_anon_insert on album_comments
  for insert to anon
  with check (
    user_id is null
    and exists (select 1 from albums a where a.id = album_id and a.is_published)
    and (
      parent_id is null
      or exists (
        select 1 from album_comments c
        where c.id = parent_id
          and c.album_id = album_comments.album_id
          and c.parent_id is null
      )
    )
  );
create policy album_comments_author_insert on album_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from albums a where a.id = album_id and a.author_id = auth.uid())
  );
create policy album_comments_author_update on album_comments
  for update to authenticated
  using (exists (select 1 from albums a where a.id = album_comments.album_id and a.author_id = auth.uid()))
  with check (exists (select 1 from albums a where a.id = album_comments.album_id and a.author_id = auth.uid()));
create policy album_comments_author_delete on album_comments
  for delete to authenticated
  using (exists (select 1 from albums a where a.id = album_comments.album_id and a.author_id = auth.uid()));

-- Grant CỘT (đúng chiều, khuôn 0011): rút SELECT cấp bảng rồi cấp lại danh sách cột công khai.
-- KHÔNG dùng `revoke select (cột)` — vô hiệu khi còn grant cấp bảng.
revoke select on album_comments from anon, authenticated;
grant select (id, album_id, parent_id, user_id, author_name, body, is_hidden, created_at)
  on album_comments to anon, authenticated;
-- Tác giả chỉ đổi được is_hidden (kiểm duyệt, không giả mạo).
revoke update on album_comments from authenticated;
grant update (is_hidden) on album_comments to authenticated;

-- Rate-limit ≤5 bình luận/phút/IP cho khách (bản sao 0007 trỏ vào album_comments).
create or replace function album_comments_rate_limit()
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
    return new;
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
    from album_comments
    where anon_ip = new.anon_ip
      and created_at > now() - interval '1 minute';
    if recent >= 5 then
      raise exception 'rate_limited' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function album_comments_rate_limit() from public, anon, authenticated;
create trigger trg_album_comments_rate_limit
  before insert on album_comments
  for each row execute function album_comments_rate_limit();

-- ===== RPC đổi thứ tự: MỘT câu UPDATE; security invoker -> RLS photos_author_all lo quyền. =====
create or replace function reorder_photos(p_album_id uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update photos p
  set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where p.id = o.id and p.album_id = p_album_id;
$$;
revoke execute on function reorder_photos(uuid, uuid[]) from public, anon;
grant execute on function reorder_photos(uuid, uuid[]) to authenticated;

-- ===== STORAGE: bucket photos (public read, chỉ authenticated ghi; chặn rác ở tầng bucket) =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 3145728, '{image/webp}')
on conflict (id) do nothing;

create policy "photos public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'photos');
create policy "photos author upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos');
create policy "photos author delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos');
