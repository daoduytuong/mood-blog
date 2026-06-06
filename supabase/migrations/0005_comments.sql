-- Mood Blog — Phase-2 Lát 1: bình luận công khai có-tên-không-tài-khoản.
-- Khách (anon) đăng bình luận GỐC; Tác giả (đã đăng nhập) TRẢ LỜI 1 tầng.
-- Badge "tác giả" suy từ user_id = author của post (SERVER-TRUTH) — KHÔNG từ tên gõ.

create table comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  parent_id   uuid references comments(id) on delete cascade,     -- null = bình luận gốc; có = trả lời
  user_id     uuid references auth.users(id) on delete set null,  -- null = khách; = tác giả khi đáp
  anon_id     text,                                               -- danh tính localStorage của khách (không PII)
  author_name text not null,
  body        text not null,
  is_hidden   boolean not null default false,                     -- Lát 2: chủ nhà ẩn
  created_at  timestamptz not null default now(),
  constraint comment_body_len check (char_length(body) between 1 and 500),
  constraint comment_name_len check (char_length(author_name) between 1 and 40)
);

create index idx_comments_post on comments (post_id, created_at);
create index idx_comments_parent on comments (parent_id);

alter table comments enable row level security;

-- Đọc công khai: bình luận chưa ẩn (mọi vai)
create policy comments_public_read on comments
  for select using (is_hidden = false);

-- Khách ẩn danh: CHỈ chèn bình luận gốc, user_id BẮT BUỘC null (không thể giả danh tác giả)
create policy comments_anon_insert on comments
  for insert to anon
  with check (user_id is null and parent_id is null);

-- Tác giả (đã đăng nhập): chèn trả lời cho bài CỦA MÌNH, user_id = auth.uid()
create policy comments_author_insert on comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- Tác giả ẩn/sửa/xoá bình luận trên bài của mình (dùng từ Lát 2)
create policy comments_author_update on comments
  for update to authenticated
  using (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

create policy comments_author_delete on comments
  for delete to authenticated
  using (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));
