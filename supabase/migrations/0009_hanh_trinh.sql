-- Mood Blog — Hành trình (journey): loại bài thứ 3, post lớn dần theo "chặng".
-- Mỗi chặng = 1 phần tử trong cột media jsonb sẵn có: {path,w,h,blurDataURL,date,note}.
-- KHÔNG cần bảng/cột mới — chỉ thêm giá trị enum.
-- Chạy trong Supabase SQL Editor (user chạy thủ công).

alter type post_type add value if not exists 'hanh_trinh';
