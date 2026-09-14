-- Mood Blog — bucket `photos` nhận thêm image/jpeg.
--
-- Vì sao: canvas.toBlob(canvas, "image/webp", 0.8) KHÔNG báo lỗi khi trình duyệt
-- không nén được webp lossy — nó lặng lẽ trả png, hoặc trả đúng image/webp nhưng
-- bỏ qua `quality` (webp không mất dữ liệu). Đo thật trên iOS 18.6 (WebKit):
-- một tấm jpeg 3.19 MB thu về 2048×1366 ra file 5.26 MB, vượt file_size_limit
-- 3 MB của bucket -> hỏng ngay tấm ảnh đầu tiên và dừng cả lượt upload.
--
-- src/features/compose/resize-image.ts giờ kiểm cả kiểu lẫn cỡ blob rồi rơi về
-- jpeg (trình duyệt nào cũng nén lossy đúng, ~0.5 MB ở 2048px). Bucket phải nhận
-- kiểu đó, nếu không Storage trả "mime type not supported".
--
-- file_size_limit giữ nguyên 3 MB: sau khi sửa, ảnh 2048px luôn dưới 1 MB; trần
-- này là lưới chặn ảnh bất thường, không phải hạn mức thường dùng.

update storage.buckets
   set allowed_mime_types = '{image/webp,image/jpeg}'
 where id = 'photos';
