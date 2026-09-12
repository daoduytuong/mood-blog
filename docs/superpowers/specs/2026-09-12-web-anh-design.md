# Thiết kế: Web chia sẻ ảnh (khu `/anh`)

Ngày: 2026-09-12
Trạng thái: đã duyệt thiết kế, đã rà soát lần 2 (2026-09-12), chờ lập kế hoạch

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

Kết luận: ảnh nằm trên Supabase Storage, webp 2048px như `resize-image.ts` hiện có. Ảnh máy ảnh nhiều chi tiết ở 2048px q0.8 thường 600KB-1MB (bucket `media` hiện có: p50 238KB nhưng trung bình 1.27MB). 1GB Free ≈ 1000-1500 ảnh ≈ 30-50 album — đủ cho vài năm, nhưng không phải "vô hạn".

## Kiến trúc

```
src/app/anh/
  page.tsx                 lưới bìa album        (revalidate 300)
  [slug]/page.tsx          trang album           (revalidate 300 + generateStaticParams)
src/app/me/anh/
  page.tsx                 danh sách album để sửa (force-dynamic)
  [id]/page.tsx            sửa album (form duy nhất; "tạo mới" = action tạo nháp rồi redirect vào đây)
src/features/photos/
  queries.ts               đọc công khai (public client)
  actions.ts               "use server" — tạo nháp/sửa/xoá/đăng/đổi thứ tự
  AlbumForm.tsx            form đăng
  AlbumGrid.tsx            lưới bìa + chuyển mode
  ExifPanel.tsx            khối thông số ẩn/hiện
  exif.ts                  đọc EXIF phía client
src/lib/db/
  albums.ts                chokepoint supabase.from() cho album + ảnh (+ rpc reorder_photos)
  photo-hearts.ts          tim album
  photo-comments.ts        bình luận album
src/features/hearts/       SỬA: useHeart/HeartButton/LikeCount/anon.ts nhận tham số
                           { table: "hearts" | "album_hearts", idColumn, storageKey }
                           thay vì gắn cứng bảng hearts + key mb_liked
```

Tuân `AGENTS.md`: mọi `supabase.from()` nằm trong `src/lib/db/`, feature ở `src/features/<tên>/`, route công khai tiếng Việt (tiền lệ `/tam-trang`, `/lich`).

Ba client Supabase dùng đúng như mood-blog: `public.ts` cho `/anh` và `/anh/[slug]` (giữ static/ISR), `server.ts` cho khu `/me/anh`, `client.ts` cho tim + bình luận của khách.

Khu ảnh KHÔNG dùng `mood` — đây là lý do chính tách bảng.

Nav: thêm mục "Ảnh" vào header. Dùng chung wordmark/theme/toggle với mood-blog, không dựng layout thứ hai.

Storage: bucket mới `photos`, tách khỏi `media` để policy và quota nhìn rõ ràng. Tạo bucket với `file_size_limit = 3145728` (3MB) và `allowed_mime_types = '{image/webp}'` ngay trong migration — chặn rác ở tầng Storage, không cần code. Cần thêm `photoPublicUrl()` trong `src/lib/storage.ts` (song song `mediaPublicUrl`).

**Ảnh trên Storage là immutable.** Path là `<user>/<uuid>.webp`, upload `upsert: false`, không bao giờ ghi đè; đổi ảnh = path mới + xoá path cũ. Nhờ vậy upload đặt `cacheControl: "31536000"` (1 năm) và `next.config.ts` đặt `minimumCacheTTL = 31 ngày` mà không sợ ảnh cũ kẹt cache. (Hai thứ này đã áp cho mood-blog cùng ngày rà soát — xem *Rendering và quota*.)

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

-- RPC đổi thứ tự: MỘT câu UPDATE thay vì 30 round-trip; RLS photos lo quyền.
create function reorder_photos(p_album_id uuid, p_ids uuid[]) returns void
  language sql security invoker as $$
  update photos p set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where p.id = o.id and p.album_id = p_album_id;
$$;
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
- Tim: anon INSERT được, KHÔNG SELECT bảng tim. Tổng chỉ qua view `album_heart_counts` (`security_invoker = off`, chỉ đếm album đã publish) — đúng khuôn migration 0010. Danh tính người thả không bao giờ lộ. Thêm policy DELETE `using (true)` như `hearts_anon_delete` (0004) — không có thì `useHeart` gỡ tim lỗi im lặng.
- `album_comments`: **KHÔNG dùng `revoke select (cột)`** — pattern của 0007 vô hiệu vì Supabase grant SELECT cấp bảng cho anon/authenticated, và Postgres bỏ qua revoke cấp cột khi grant cấp bảng còn (phát hiện khi rà soát, đã vá cho `comments` ở migration 0011). Cách đúng:
  ```sql
  revoke select on album_comments from anon, authenticated;
  grant select (id, album_id, parent_id, user_id, author_name, body, is_hidden, created_at)
    on album_comments to anon, authenticated;
  ```
  Grant cấp cột vẫn cho `count(*)` chạy nên embed đếm bình luận không gãy. Tầng db vẫn dùng danh sách cột tường minh (phòng thủ hai lớp).
- Rate-limit: trigger `comments_rate_limit` hardcode `from comments`. Viết hàm mới `album_comments_rate_limit()` cùng logic (≤5/phút/IP, chỉ khách), gắn `before insert on album_comments`. Không sửa hàm cũ để khỏi chạm bảng đang chạy. `revoke execute` khỏi anon/authenticated như 0011.
- Khách chỉ bình luận lên album ĐÃ publish (`exists (select 1 from albums a where a.id = album_id and a.is_published)`), `user_id is null`, reply 2 tầng như 0008.
- Tác giả chỉ UPDATE được `is_hidden` trên bình luận (kiểm duyệt, không giả mạo): `revoke update on album_comments from authenticated; grant update (is_hidden) ...` — revoke cấp bảng rồi grant cấp cột là đúng chiều, pattern này 0007 làm đúng.

## EXIF

### Đọc

`exifr` bản **lite** (`exifr/dist/lite.esm.mjs`, 12KB gzip; bản full 22KB, mini 8KB nhưng chỉ trả key số) ở client, chạy TRƯỚC `resizeImage()`. Thứ tự này bắt buộc: canvas re-encode xoá sạch metadata, đọc sau thì không còn gì. Không cần xử lý Orientation: `createImageBitmap` mặc định `imageOrientation: "from-image"` nên ảnh đã xoay đúng trước khi vẽ lên canvas.

`taken_at`: EXIF `DateTimeOriginal` không có múi giờ; exifr trả `Date` theo tz của trình duyệt tác giả. Chấp nhận (một tác giả, chụp ở đâu thì đăng ở đó), ghi ở *Hạn chế đã biết*.

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

**Nháp cứu công.** `photos` cần `album_id` trước khi chèn, nên **row album nháp được tạo NGAY khi bấm "Album mới"** (action `createDraftAlbum` → redirect `/me/anh/[id]`), không có form "tạo mới" riêng. Mỗi ảnh xử lý xong là một insert `photos` gắn vào id đó — hỏng ở ảnh 12/30 thì 11 ảnh đã nằm trong nháp, mở lại tiếp tục. Chữ (tên/địa điểm/mô tả) lưu khi bấm "Lưu nháp" như mood-blog.

**Đổi thứ tự** ghi bằng RPC `reorder_photos(album_id, ids[])` — một câu UPDATE, không 30 round-trip, không upsert đòi đủ cột NOT NULL.

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

**Nhớ lựa chọn**: `localStorage` key `mb_photo_view`, đọc trong **cùng** inline script chống FOUC đã có ở `layout.tsx` (thêm 1 dòng đặt `data-view` lên `<html>`), không thêm script thứ hai. Không có bước này thì mỗi lần tải sẽ nháy lưới rồi nhảy sang bài viết.

CSS đọc `data-view` để bố cục đúng ngay lần vẽ đầu; React quyết định có render ảnh xem trước hay không. Hai cơ chế phối hợp: CSS lo khỏi nháy, React lo khỏi tải thừa.

KHÔNG dùng `?view=` — query param đẩy trang sang dynamic, đúng bài học `?mood=` đã ghi trong `CLAUDE.md`. Mode là state client, `/anh` vẫn `revalidate = 300`.

Nút chuyển đặt góc phải đầu trang, hai icon nhỏ, `aria-pressed`. Đổi bố cục không kèm animation.

## Album hiện bên mood-blog

Một dải "Ảnh mới" trên `/`: hàng ngang 3-4 bìa album mới nhất, đặt trên
`FeedList`, kèm link "xem tất cả" sang `/anh`.

### Vì sao KHÔNG đi qua `/feed.xml`

Hai lý do, lý do đầu là chặn cứng:

1. **Feed không chứa ảnh.** `/feed.xml` cố ý chỉ phát text thuần — không
   `<enclosure>`, không `media:content`, không đường dẫn Storage (xem chú thích
   trong `src/app/feed.xml/route.ts`: "không nhúng ảnh, giữ RSS nhẹ và không
   hot-link Storage"). Trong feed không có ảnh để lấy.
2. **Chung một database.** Sinh XML rồi parse ngược là đi vòng ra internet để
   lấy thứ nằm cách đó một câu query — mất kiểu dữ liệu, mất `blurDataURL`,
   thêm một đường gãy được.

Dải này đọc thẳng bảng `albums` qua `public.ts`.

### Vì sao là dải riêng, KHÔNG trộn vào feed

Feed phân trang keyset trên `(created_at, id)` của bảng `posts`. Chèn nguồn thứ
hai vào giữa dòng đó bắt con trỏ phải hiểu cả hai bảng — thiếu thì trang 2 nhảy
cóc hoặc lặp bài; làm đúng thì cần một SQL view UNION.

Thêm nữa, mọi card trong feed đều vẽ `MoodBar`, mà album cố ý không có `mood`.

Dải riêng né cả hai: nó nằm NGOÀI `FeedList`, là một server component đọc một
query riêng. `FeedList`, `loadMorePosts`, `getFreshFeed` và localStorage cache
không đổi một dòng.

### Chi tiết

- `getRecentAlbums(limit = 4)` trong `src/lib/db/albums.ts` — chỉ album đã
  publish, mới nhất trước, mỗi album lấy đúng ảnh bìa.
- Render trong `src/app/page.tsx`, TRÊN `<FeedList>`, dưới `<MoodFilterChips>`. Lưu ý `page.tsx` đang `return` sớm khi `posts.length === 0` — dải phải nằm ngoài nhánh đó, không thì có album mà chưa có bài là mất dải.
- Chưa có album nào thì KHÔNG render gì — không nhắc "chưa có ảnh" (cùng tinh
  thần `DraftList`, `MemoriesSection`).
- `/` vẫn `revalidate = 300`. Đăng album gọi thêm `revalidatePath("/")`.
- Bìa dùng `sizes="120px"` → rơi vào biến thể 320 có sẵn. 4 ảnh, ~4 transform,
  cache chung với lưới `/anh`.
- Không animation; hover chỉ đổi viền.

Chiều ngược lại (bài mood-blog hiện bên `/anh`) KHÔNG làm — `/anh` giữ thuần ảnh.

## Rendering và quota

| Route | Chế độ |
|---|---|
| `/anh`, `/anh/[slug]` | `revalidate = 300`, public client (giữ static) |
| `/me/anh/*` | `force-dynamic` |

Mọi mutation: `revalidatePath("/anh")` + `revalidatePath("/anh/<slug>")` +
`revalidatePath("/")` (dải "Ảnh mới" nằm trên trang chủ).

Phục vụ ảnh:

| Nơi | Cách | Transform |
|---|---|---|
| Dải "Ảnh mới" trên `/` | `next/image` @320, 4 bìa | ~4, cache chung với lưới |
| Lưới bìa | `next/image`, 1 ảnh/album | ~2/album |
| Ảnh xem trước (editorial) | `next/image` @320 | ~3/album, chỉ khi bấm sang mode đó |
| Trang album | `next/image` | ~60-90/album |
| Xem to (lightbox) | URL Storage THẲNG, không qua optimizer | 0 |

Dòng cuối quan trọng: ảnh đã là webp 2048px sẵn, cho `next/image` xử lý lại chỉ đốt transform mà không thêm gì.

**Cache TTL là điều kiện tiên quyết của mọi con số trên.** Vercel tính transform cho cả MISS lẫn STALE; TTL ảnh remote = max(`max-age` upstream, `minimumCacheTTL`). Trước rà soát: Supabase upload mặc định `max-age=3600`, Next 16 mặc định `minimumCacheTTL` 4h → mỗi lần xem lại sau 4h tốn thêm 1 transform, một album 30 ảnh xem 3 lần/ngày đốt ~180/ngày. Đã sửa cùng ngày rà soát (áp cho cả mood-blog):
- `next.config.ts`: `images.minimumCacheTTL = 2678400` (31 ngày).
- Mọi `.upload()`: `cacheControl: "31536000"`.
An toàn vì path ảnh là uuid, không ghi đè (xem *Kiến trúc*).

Với TTL 31 ngày: 50 album × 30 ảnh ≈ 4500 transforms **một lần**, rải theo lúc đăng; tháng bình thường chỉ album mới tốn (~60-90). Xem to dùng `Lightbox` có sẵn (`src/components/ui/Lightbox.tsx`, đã dùng `<img>` thẳng) — không viết lightbox mới.

KHÔNG nới `deviceSizes` trong `next.config.ts` — giữ `[640, 828, 1200]`, mood-blog không bị ảnh hưởng.

SEO/chia sẻ: `sitemap.ts` thêm `/anh` và mọi `/anh/[slug]` đã publish; `/anh/[slug]` có `generateMetadata` với `og:image` = ảnh bìa qua `photoPublicUrl` (cùng khuôn `/m/[slug]`).

## Ngoài phạm vi (cố ý bỏ)

- **Map nhúng** — bản đầu dùng `place` dạng chữ. Thêm toạ độ sau chỉ là 2 cột `lat/lng`, không phải viết lại.
- **Google Photos** — đã chứng minh không khả thi ở trên.
- **Ảnh full-res / RAW** — 1GB Free không chứa nổi.
- **Tag / lọc theo tiêu cự** — EXIF đã tách cột nên làm được bất cứ lúc nào; chưa có ảnh thì lọc vô nghĩa.
- **Tim theo từng ảnh** — chốt tim ở mức album.
- **RSS cho ảnh** — `/feed.xml` là mẫu sẵn, thêm sau.
- **Nhiều người đăng** — một tác giả, dùng nguyên auth model hiện tại.
- **Trộn album vào feed `/` theo thời gian** — cần view UNION để keyset chạy
  đúng, và phải gán mood cho album. Dải riêng đã đủ dẫn người đọc sang `/anh`.
- **Import qua RSS** — `/feed.xml` không chứa ảnh, và hai khu chung một DB nên
  không có gì để "import".
- **Bài mood-blog hiện bên `/anh`** — `/anh` giữ thuần ảnh.

## Hạn chế đã biết

- `taken_at` theo múi giờ trình duyệt lúc đăng, không phải nơi chụp.
- Tổng tim công khai + INSERT tự do = bơm số ảo được (trade-off đã chấp nhận ở 0010).
- `albumSlugExists()` chỉ thấy nháp của chính tác giả (như `slugExists` của posts); `slug unique` ở DB là chốt cuối.
- Ảnh trên Storage vẫn phải dọn trong action trước khi xoá row (FK cascade không dọn Storage).

## Bất biến phải giữ

- Không hardcode hex màu tâm trạng; khu ảnh không dùng mood.
- Ảnh Storage immutable: không ghi đè path; đổi ảnh = path mới.
- Tim ẩn danh: không mở SELECT bảng tim cho anon; tổng chỉ qua view aggregate.
- `album_comments`: SELECT cấp bảng bị rút, chỉ grant danh sách cột công khai (không `anon_id`/`anon_ip`); tầng db vẫn dùng danh sách cột tường minh.
- Không spinner quay; hover chỉ đổi màu/viền, không chuyển động.
- Service-role key không chạm client.
- `supabase.from()` chỉ nằm trong `src/lib/db/`.
- Primitive UI bắt buộc (`Button`, `Input`, `Textarea`, `Field`, `Chip`); biến thể qua prop, không chồng `className`.
- Chữ/icon màu accent dùng `text-accent-text`, nền/viền dùng `accent`.

## Định nghĩa hoàn thành

`npm run lint` sạch · `npx tsc --noEmit` sạch · `npm run build` pass · không lộ secret · không phá bất biến trên.
