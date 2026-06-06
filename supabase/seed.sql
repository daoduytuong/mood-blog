-- Mood Blog — Story 1.9: seed dữ liệu mẫu (chạy trong Supabase SQL Editor).
-- • Idempotent: chạy lại KHÔNG nhân đôi (on conflict slug do nothing).
-- • Tác giả = user đầu tiên trong auth.users (tạo account trước khi seed).
-- • Phủ đủ 6 tâm trạng × cả 2 loại (Khoảnh khắc + Góc đọc).
-- • Lưu ý: Khoảnh khắc seed KHÔNG kèm ảnh (ảnh thật upload khi soạn bài qua app)
--   -> hiện dạng caption; đủ để dựng/test Feed · PostCard · MoodBar.
-- Dọn seed:  delete from posts where slug like 'seed-%';

with author as (
  select id from auth.users order by created_at asc limit 1
)
insert into posts (author_id, type, mood, caption, excerpt, link_url, media, slug, created_at)
select
  a.id,
  v.type::post_type,
  v.mood::mood_code,
  v.caption,
  v.excerpt,
  v.link_url,
  '[]'::jsonb,
  v.slug,
  now() - (v.ord * interval '1 minute')
from author a
cross join (values
  ('goc_doc','hoai_niem','Đọc lại, thấy mình của mấy mùa trước.','Có những ngày tháng chỉ để nhớ về.','https://example.com/hoai-niem','seed-gd-hoai-niem',1),
  ('goc_doc','binh_yen','Một bài viết khiến lòng dịu xuống.','Bình yên là khi không cần phải vội.','https://example.com/binh-yen','seed-gd-binh-yen',2),
  ('goc_doc','vui','Cười một mình giữa trưa.','Niềm vui nhỏ cũng đủ làm sáng cả ngày.','https://example.com/vui','seed-gd-vui',3),
  ('goc_doc','buon','Đọc xong thấy nghèn nghẹn.','Có nỗi buồn chỉ cần được gọi tên là đã nhẹ hơn.','https://example.com/buon','seed-gd-buon',4),
  ('goc_doc','tram_tu','Ngồi nghĩ hơi lâu sau khi đọc.','Đôi khi câu hỏi quan trọng hơn câu trả lời.','https://example.com/tram-tu','seed-gd-tram-tu',5),
  ('goc_doc','co_don','Như viết hộ mình.','Cô đơn không phải thiếu người, mà thiếu sự thấu.','https://example.com/co-don','seed-gd-co-don',6),
  ('khoanh_khac','binh_yen','Tách trà còn ấm, nắng vừa lên.',null,null,'seed-kk-binh-yen',7),
  ('khoanh_khac','vui','Bản nhạc cũ bật lên, tự dưng muốn nhảy.',null,null,'seed-kk-vui',8),
  ('khoanh_khac','tram_tu','Mưa cả chiều, không làm gì cả.',null,null,'seed-kk-tram-tu',9),
  ('khoanh_khac','hoai_niem','Tìm thấy tấm vé xem phim năm nào.',null,null,'seed-kk-hoai-niem',10)
) as v(type, mood, caption, excerpt, link_url, slug, ord)
on conflict (slug) do nothing;
