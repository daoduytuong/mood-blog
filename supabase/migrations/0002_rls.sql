-- Mood Blog — Story 1.3: Row Level Security (deny mặc định + đúng ma trận quyền)
-- Ma trận:
--   posts:  anon SELECT (bài published) ✓ | anon INSERT/UPDATE/DELETE ✗ | author full CRUD bài của mình
--   hearts: anon INSERT ✓ | anon SELECT/UPDATE/DELETE ✗ | author SELECT tim của bài mình (đếm tổng)
-- Bất biến: anon KHÔNG đọc được hearts -> "tổng tim chỉ tác giả thấy" enforce ở tầng dữ liệu.
-- (Policy DELETE 'gỡ tim' cho anon định nghĩa ở Story 3.2.)

alter table posts  enable row level security;
alter table hearts enable row level security;

-- POSTS: đọc công khai bài đã publish
create policy posts_public_read on posts
  for select
  using (is_published);

-- POSTS: tác giả toàn quyền với bài của mình
create policy posts_author_all on posts
  for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- HEARTS: ai cũng thả tim được (insert), KHÔNG select/update/delete
create policy hearts_anon_insert on hearts
  for insert
  with check (true);

-- HEARTS: tác giả đọc tim của bài mình (để đếm tổng ở /me)
create policy hearts_author_read on hearts
  for select
  using (
    exists (
      select 1 from posts p
      where p.id = hearts.post_id
        and p.author_id = auth.uid()
    )
  );
