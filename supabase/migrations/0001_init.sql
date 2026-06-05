-- Mood Blog — Story 1.3: schema khởi tạo
-- Lưu MÃ tâm trạng (enum), KHÔNG lưu màu (màu suy từ design token qua src/lib/moods.ts).

-- ===== ENUM =====
create type post_type as enum ('khoanh_khac', 'goc_doc');
create type mood_code as enum ('hoai_niem', 'binh_yen', 'vui', 'buon', 'tram_tu', 'co_don');

-- ===== POSTS =====
create table posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references auth.users(id) on delete cascade,
  type         post_type not null,
  mood         mood_code not null,
  caption      text,                                   -- khoanh_khac: caption | goc_doc: cảm nhận
  excerpt      text,                                   -- goc_doc: đoạn trích
  link_url     text,                                   -- goc_doc: link nguồn
  media        jsonb not null default '[]'::jsonb,     -- ảnh: [{path,w,h,blurhash}] | video: [{provider:'vimeo',video_id,poster_url}]
  slug         text unique not null,                   -- URL chia sẻ /m/[slug]
  is_published boolean not null default true,          -- publish ngay; KHÔNG draft ở MVP
  created_at   timestamptz not null default now(),
  constraint goc_doc_has_source
    check (type <> 'goc_doc' or (link_url is not null or excerpt is not null))
);

-- Index Feed (mới nhất trước) + lọc theo mood (V1.5) — chỉ bài đã publish
create index idx_posts_feed on posts (created_at desc) where is_published;
create index idx_posts_mood on posts (mood, created_at desc) where is_published;

-- ===== HEARTS (tim lặng, ẩn danh) =====
create table hearts (
  post_id    uuid not null references posts(id) on delete cascade,
  anon_id    text not null,                            -- UUID từ localStorage (không PII)
  created_at timestamptz not null default now(),
  primary key (post_id, anon_id)                       -- idempotent: 1 anon 1 tim/bài, chống double-tap
);
