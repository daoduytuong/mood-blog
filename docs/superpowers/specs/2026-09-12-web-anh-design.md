# Thiết kế: Web chia sẻ ảnh (khu `/anh`)

Ngày: 2026-09-12
Trạng thái: đã duyệt thiết kế, chờ lập kế hoạch

## Mục tiêu

Một khu trưng bày ảnh chụp bằng máy ảnh, nằm trong cùng repo mood-blog: album ảnh có thông số chụp (EXIF), địa điểm dạng chữ, khách ẩn danh thả tim và bình luận ở mức album, trang đầu xem được theo hai chế độ (lưới / bài viết).

Một tác giả, thuần cá nhân, không thương mại (giữ nguyên ràng buộc Vercel Hobby).

## Bối cảnh và quyết định nền

### Tại sao khu riêng, không phải loại bài thứ tư

`posts.mood` là NOT NULL — ép mỗi bộ ảnh mang một trong sáu tâm trạng là bóp méo cả hai domain. `posts.media` là JSONB — chôn EXIF trong đó thì không index được, không lọc được theo tiêu cự, và mỗi lần sửa một ảnh phải ghi lại cả mảng. Feed cảm xúc cũng không nên bị một bộ 40 ảnh nuốt chỗ.

Repo riêng thì phải dựng lại auth, Storage, RLS, design system, và đặc biệt là hệ tim ẩn danh đã qua hardening (migration 0007, 0010) — đắt mà không đổi lại được gì, vì quota Free tier giống hệt nhau ở cả hai cách.

### Google Photos: đã loại, có căn cứ

Ba rào, mỗi rào đủ chặn một mình:

1. Scope `photoslibrary.readonly` bị Google gỡ 31/03/2025 — gọi vào trả `403 PERMISSION_DENIED`. Thay thế duy nhất là Picker API.
2. `baseUrl` của Picker sống 60 phút và bắt buộc header `Authorization: Bearer <token>`. Thẻ `<img>` không gửi được header nên không nhúng thẳng vào trang được. Token lại là của tác giả, không phát cho khách ẩn danh được.
3. Picker là hộp thoại chọn file: mỗi lần lấy ảnh Google bắt tác giả đăng nhập và chọn tay. Không có đường "web tự đọc album".

Cách lách bằng scrape JSON của shared album là API không chính thức, vi phạm ToS và gãy bất cứ lúc nào. Không dùng.

Kết luận: ảnh nằm trên Supabase Storage, webp 2048px như `resize-image.ts` hiện có. Sức chứa ~300-500KB/ảnh, 1GB Free ≈ 2000-3000 ảnh ≈ 50-100 album.

## Kiến trúc

```
src/app/anh/
  page.tsx                 lưới bìa album        (revalidate 300)
  [slug]/page.tsx          trang album           (revalidate 300 + generateStaticParams)
src/app/me/anh/
  page.tsx                 danh sách album để sửa (force-dynamic)
  moi/page.tsx             tạo album mới
  [id]/page.tsx            sửa album
src/features/photos/
  queries.ts               đọc công khai (public client)
  actions.ts               "use server" — tạo/sửa/xoá/đăng
  AlbumForm.tsx            form đăng
  AlbumGrid.tsx            lưới bìa + chuyển mode
  ExifPanel.tsx            khối thông số ẩn/hiện
  exif.ts                  đọc EXIF phía client
src/lib/db/
  albums.ts                chokepoint supabase.from() cho album + ảnh
  photo-hearts.ts          tim album
  photo-comments.ts        bình luận album
```

Tuân `AGENTS.md`: mọi `supabase.from()` nằm trong `src/lib/db/`, feature ở `src/features/<tên>/`, route công khai tiếng Việt (tiền lệ `/tam-trang`, `/lich`).

Ba client Supabase dùng đúng như mood-blog: `public.ts` cho `/anh` và `/anh/[slug]` (giữ static/ISR), `server.ts` cho khu `/me/anh`, `client.ts` cho tim + bình luận của khách.

Khu ảnh KHÔNG dùng `mood` — đây là lý do chính tách bảng.

Nav: thêm mục "Ảnh" vào header. Dùng chung wordmark/theme/toggle với mood-blog, không dựng layout thứ hai.

Storage: bucket mới `photos`, tách khỏi `media` để policy và quota nhìn rõ ràng. Cần thêm `photoPublicUrl()` trong `src/lib/storage.ts` (song song `mediaPublicUrl`).

## Schema

```sql
albums (
  id uuid pk,
  author_id uuid -> auth.users,
  slug text unique,
  title text not null,              -- "Sập Sài"
  place text,                       -- "Hà Giang" — chữ thuần, không toạ độ
  description text,
  cover_photo_id uuid,              -- null = lấy ảnh đầu
  shot_on date,                     -- ngày chụp (khác ngày đăng)
  is_published boolean default false,
  created_at timestamptz
)

photos (
  id uuid pk,
  album_id uuid -> albums on delete cascade,
  path text not null,
  w int, h int, blur_data_url text,
  alt text,
  caption text,
  position int not null,
  -- EXIF, mỗi thứ một cột để query được:
  camera text,                      -- "Fujifilm X-T5"
  lens text,                        -- "XF 35mm F1.4 R"
  focal_length int,                 -- 35
  aperture numeric(3,1),            -- 1.4
  shutter text,                     -- "1/250"
  iso int,
  taken_at timestamptz,             -- EXIF DateTimeOriginal
  created_at timestamptz
)

album_hearts   (album_id -> albums on delete cascade, anon_id, created_at,
                primary key (album_id, anon_id))
album_comments (id, album_id -> albums on delete cascade, parent_id, user_id,
                anon_id, anon_ip, author_name, body, is_hidden, created_at)
album_heart_counts  -- view aggregate, security_invoker = off
```

Xoá album thì tim và bình luận rụng theo FK cascade, đúng như `deletePostAction`
của mood-blog dựa vào. Ảnh trên Storage vẫn phải dọn tay trước khi xoá hàng.

### Ba quyết định cần nêu lý do

**EXIF tách cột, không JSONB.** Đây là điều `posts.media` không làm được. Tách cột thì `where focal_length = 35` chạy được, muốn thêm trang "ảnh chụp bằng 35mm" sau này chỉ là một query. `taken_at` cho phép sắp theo lúc CHỤP, không theo lúc đăng.

**`is_published` có từ đầu.** Album 30 ảnh càng cần lưu dở; upload hỏng giữa chừng mà mất trắng là không chấp nhận được. Đỡ một migration về sau.

**Tim/bình luận là bảng gương, cố ý trùng lặp.** Không nhét `album_id` vào `hearts` hiện tại: bảng đó có `post_id NOT NULL` và view `heart_counts` phụ thuộc vào nó; thêm cột nullable sẽ làm RLS và view rối, đe doạ một bất biến đã hardened. Chép sang bảng mới rẻ hơn và an toàn hơn.

### RLS — giữ nguyên mô hình đã hardened

- `albums_public_read using (is_published)` — nháp vô hình với mọi đường công khai.
- `albums_author_all` cho tác giả.
- `photos` đọc theo album đã publish; ghi chỉ tác giả.
- Tim: anon INSERT được, KHÔNG SELECT bảng tim. Tổng chỉ qua view `album_heart_counts` (`security_invoker = off`, chỉ đếm album đã publish) — đúng khuôn migration 0010. Danh tính người thả không bao giờ lộ.
- `album_comments`: REVOKE `anon_id`/`anon_ip` khỏi SELECT (chống theo dõi khách xuyên album, đúng bài học migration 0007). Tầng db dùng danh sách cột tường minh; không bao giờ thêm hai cột đó vào select.
- Tác giả chỉ UPDATE được `is_hidden` trên bình luận (kiểm duyệt, không giả mạo).

## EXIF

### Đọc

`exifr` (~10KB gzip) ở client, chạy TRƯỚC `resizeImage()`. Thứ tự này bắt buộc: canvas re-encode xoá sạch metadata, đọc sau thì không còn gì.

```
file -> exifr.parse(file) -> {camera, lens, focal, aperture, shutter, iso, takenAt}
     -> resizeImage(file) -> {blob 2048px webp, w, h, blurDataURL}
     -> upload blob + insert row (EXIF đã tách sẵn)
```

Lợi phụ đáng kể: re-encode webp tự động xoá GPS khỏi file công khai — không vô tình phát toạ độ nhà cho internet. Vị trí duy nhất hiện ra là `albums.place`, chữ do tác giả tự gõ.

EXIF thiếu thì để trống, KHÔNG chặn đăng: ảnh scan, ảnh crop qua app, ảnh export sai thường mất metadata.

### Hiện

Mặc định trang chỉ có ảnh + chữ. Dưới mỗi ảnh một dòng nhỏ `35mm · f/1.8 · 1/250 · ISO 200`; bấm mới bung khối đầy đủ (thân máy, ống kính, giờ chụp).

Dùng `<details>`/`<summary>` thuần HTML — không JS, không state, chạy cả khi JS chưa tải. Hợp bất biến "hover chỉ đổi màu, không chuyển động": bung/thu là thay đổi bố cục do người dùng chủ động, không phải animation trang trí.

## Luồng đăng

```
/me/anh/moi
  [Tên album] [Địa điểm] [Ngày chụp]
  [Mô tả]
  [+ Chọn ảnh]  -> chọn 30 file cùng lúc

  Đang xử lý 12/30…   ████████░░░░░░

  Xong -> lưới ảnh, mỗi ô:
    ảnh · 35mm f/1.8 ISO200 (chỉ đọc) · [mô tả ảnh (alt)] · [× bỏ] · [⇅ đổi thứ tự]

  [Lưu nháp]  [Đăng]
```

Bốn điều kiện kỹ thuật:

**Tuần tự, không song song.** 30 ảnh resize cùng lúc sẽ treo trình duyệt (mỗi ảnh là một canvas 2048px trong RAM). Làm từng ảnh một, hiện tiến độ. Giữ đúng tinh thần vòng `for` tuần tự của `uploadSlots` hiện tại.

**Tiến độ là thanh tĩnh, không spinner quay** — bất biến `AGENTS.md`.

**Đổi thứ tự**: HTML5 drag-and-drop thuần, không thêm thư viện. Mobile không kéo được nên có thêm nút ‹ › đổi chỗ. Mặc định xếp theo `taken_at`.

**Nháp cứu công.** Lưu nháp sau mỗi mẻ upload; hỏng giữa chừng mở lại vẫn còn. Đúng cơ chế nháp vừa build cho mood-blog.

### Slug: tạm rồi thật

Giống hệt hệ nháp của mood-blog. Nháp mang slug tạm `nhap-<base36>`; lúc Đăng mới sinh slug thật từ `title`, qua một hàm `albumSlugExists()` KHÔNG lọc `is_published` (nếu lọc thì slug đang bị một nháp chiếm vẫn coi là trống). Việc đổi `slug` + bật `is_published` gom vào một hàm `publishAlbum()` duy nhất, tự chốt bằng `.eq("is_published", false)` để trong codebase không tồn tại đường nào đổi slug của album ĐÃ đăng (vỡ OG và link đã chia sẻ).

## Hai chế độ xem trên `/anh`

Lưới: `grid-cols-3`, `aspect-square`, chỉ bìa + tên + số ảnh.
Bài viết: `grid-cols-1`, bìa lớn `aspect-[3/2]` + tên + địa điểm + mô tả + 3-4 ảnh xem trước + "xem cả N ảnh".

**Ảnh xem trước render CÓ ĐIỀU KIỆN, không ẩn bằng CSS:**

```jsx
{mode === "editorial" && <PreviewStrip photos={album.preview} />}
```

`hidden` / `display:none` vẫn tải ảnh; không render thì trình duyệt không hỏi tới. Lưới là mặc định nên phần lớn khách không bao giờ sinh transform cho ảnh xem trước.

Truy vấn lấy luôn 4 ảnh đầu mỗi album trong cùng một query — rows DB rẻ, dùng hay không tính sau.

Ảnh xem trước đặt `sizes="100px"`, rơi vào biến thể 320 có sẵn, không cần nới `next.config.ts`.

**Nhớ lựa chọn**: `localStorage` key `mb_photo_view`, cộng inline script trong `<head>` đặt `data-view` lên `<html>` trước khi vẽ — đúng khuôn mẫu chống FOUC của dark mode trong `layout.tsx`. Không có script này thì mỗi lần tải sẽ nháy lưới rồi nhảy sang bài viết.

CSS đọc `data-view` để bố cục đúng ngay lần vẽ đầu; React quyết định có render ảnh xem trước hay không. Hai cơ chế phối hợp: CSS lo khỏi nháy, React lo khỏi tải thừa.

KHÔNG dùng `?view=` — query param đẩy trang sang dynamic, đúng bài học `?mood=` đã ghi trong `CLAUDE.md`. Mode là state client, `/anh` vẫn `revalidate = 300`.

Nút chuyển đặt góc phải đầu trang, hai icon nhỏ, `aria-pressed`. Đổi bố cục không kèm animation.

## Rendering và quota

| Route | Chế độ |
|---|---|
| `/anh`, `/anh/[slug]` | `revalidate = 300`, public client (giữ static) |
| `/me/anh/*` | `force-dynamic` |

Mọi mutation: `revalidatePath("/anh")` + `revalidatePath("/anh/<slug>")`.

Phục vụ ảnh:

| Nơi | Cách | Transform |
|---|---|---|
| Lưới bìa | `next/image`, 1 ảnh/album | ~2/album |
| Ảnh xem trước (editorial) | `next/image` @320 | ~3/album, chỉ khi bấm sang mode đó |
| Trang album | `next/image` | ~60-90/album |
| Xem to (lightbox) | URL Storage THẲNG, không qua optimizer | 0 |

Dòng cuối quan trọng: ảnh đã là webp 2048px sẵn, cho `next/image` xử lý lại chỉ đốt transform mà không thêm gì.

Ước tính 50 album × 30 ảnh ≈ 4500 transforms/tháng nếu toàn bộ được xem lần đầu trong cùng một tháng — sát trần 5K nhưng cache 31 ngày nên thực tế thấp hơn nhiều, chỉ album mới mới tốn.

KHÔNG nới `deviceSizes` trong `next.config.ts` — giữ `[640, 828, 1200]`, mood-blog không bị ảnh hưởng.

## Ngoài phạm vi (cố ý bỏ)

- **Map nhúng** — bản đầu dùng `place` dạng chữ. Thêm toạ độ sau chỉ là 2 cột `lat/lng`, không phải viết lại.
- **Google Photos** — đã chứng minh không khả thi ở trên.
- **Ảnh full-res / RAW** — 1GB Free không chứa nổi.
- **Tag / lọc theo tiêu cự** — EXIF đã tách cột nên làm được bất cứ lúc nào; chưa có ảnh thì lọc vô nghĩa.
- **Tim theo từng ảnh** — chốt tim ở mức album.
- **RSS cho ảnh** — `/feed.xml` là mẫu sẵn, thêm sau.
- **Nhiều người đăng** — một tác giả, dùng nguyên auth model hiện tại.

## Bất biến phải giữ

- Không hardcode hex màu tâm trạng; khu ảnh không dùng mood.
- Tim ẩn danh: không mở SELECT bảng tim cho anon; tổng chỉ qua view aggregate.
- `album_comments`: `anon_id`/`anon_ip` REVOKE khỏi SELECT, tầng db dùng danh sách cột tường minh.
- Không spinner quay; hover chỉ đổi màu/viền, không chuyển động.
- Service-role key không chạm client.
- `supabase.from()` chỉ nằm trong `src/lib/db/`.
- Primitive UI bắt buộc (`Button`, `Input`, `Textarea`, `Field`, `Chip`); biến thể qua prop, không chồng `className`.
- Chữ/icon màu accent dùng `text-accent-text`, nền/viền dùng `accent`.

## Định nghĩa hoàn thành

`npm run lint` sạch · `npx tsc --noEmit` sạch · `npm run build` pass · không lộ secret · không phá bất biến trên.
