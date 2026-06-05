# Glossary — Việt ↔ code

Thuật ngữ thương hiệu giữ tiếng Việt ở UI; định danh code dùng tiếng Anh. Bảng map một lần:

| Tiếng Việt (UI) | Code / route | Nghĩa |
|---|---|---|
| Khoảnh khắc | `khoanh_khac` (post_type) / moment | Bài đăng cá nhân: ảnh/video + caption + tâm trạng |
| Góc đọc | `goc_doc` (post_type) / read | Bài chia sẻ: link/đoạn trích + cảm nhận + tâm trạng |
| Bài đăng | `posts` (table) / post | Đơn vị nội dung; có 2 loại trên |
| Tâm trạng | `mood_code` (enum), `src/lib/moods.ts` | Nhãn cảm xúc, 6 giá trị; ánh xạ tới 1 màu |
| Sắc màu tâm trạng | token `--color-mood-*` | Biểu hiện màu của một tâm trạng |
| Tim lặng | `hearts` (table) / quiet heart | Lượt đồng cảm ẩn danh; tổng chỉ Tác giả thấy |
| Tác giả | author (`auth.users`, 1 tài khoản) | Người duy nhất đăng nội dung |
| Người xem | visitor (anon, không tài khoản) | Khách công khai |
| Soạn bài | `/compose` | Trang tạo bài (Tác giả) |
| Trang cá nhân/tổng tim | `/me` | Dashboard Tác giả (xem tổng tim) |
| Đăng nhập | `/login` | Đăng nhập Tác giả |
| Chi tiết bài | `/m/[slug]` | Trang xem một bài, có URL chia sẻ |

6 tâm trạng: hoài niệm (`hoai_niem`) · bình yên (`binh_yen`) · vui (`vui`) · buồn (`buon`) · trầm tư (`tram_tu`) · cô đơn (`co_don`).
