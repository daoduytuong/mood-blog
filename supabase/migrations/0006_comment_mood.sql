-- Mood Blog — Phase-2 Lát 3: bình luận nhuốm màu tâm trạng (tùy chọn) + nhiệt kế cảm xúc.
-- Người xem tùy chọn "bài này khiến mình thấy ___"; gộp lại thành nhiệt kế cảm xúc của bài.
alter table comments add column mood mood_code; -- nullable: không chọn cũng được
