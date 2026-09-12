---
title: "Modal bài viết — bấm từ feed mở overlay, link chia sẻ vẫn ra trang"
date: 2026-09-11
status: approved
---

# Modal bài viết (Intercepting Routes)

## Vì sao

Bấm một bài từ feed hiện nay là rời hẳn khỏi feed sang `/m/[slug]`. Mong muốn
ban đầu là "bỏ trang detail, bấm vào thì hiện popup như Facebook".

**Không bỏ trang detail.** Facebook cũng không bỏ — mọi bài của FB đều có
permalink; popup chỉ là *cách trình bày khi bấm từ feed*. Bỏ `/m/[slug]` sẽ mất:
`ShareButton` chia sẻ vào chỗ không tồn tại; phần lớn `sitemap.ts` là URL bài
nên blog gần như vô hình với tìm kiếm; `generateMetadata` theo từng bài
(title/description/og:image) biến mất nên gửi link qua Messenger/Zalo chỉ ra
một thẻ chung chung; `revalidatePath("/m/<slug>")` trong mọi mutation thành vô
nghĩa; crawler và người tắt JS không thấy nội dung nào.

Cách đúng là **Intercepting Routes + Parallel Routes** (Next 16 hỗ trợ sẵn,
tài liệu `intercepting-routes.md` lấy đúng ví dụ này): điều hướng mềm từ feed →
overlay; mở link chia sẻ hoặc F5 → trang đầy đủ, không có overlay. Trang detail
giữ nguyên, chỉ thêm một lớp trình bày.

## Bối cảnh đã đổi so với lúc nêu ý tưởng

**Vị trí cuộn feed đã được giữ từ trước.** `src/features/feed/FeedList.tsx` ghi
`scrollY` vào localStorage theo scroll, khôi phục các trang đã "Xem thêm" khi
mount và gọi `window.scrollTo(0, c.scrollY)`. (Mục E6 của
`_bmad-output/enhancement-roadmap-2026-06-06.md` ghi là "còn tồn" — ghi sai,
code là chân lý.)

Vì vậy giá trị còn lại của modal **là trải nghiệm desktop** (ảnh lớn, bình luận
cột bên, không rời feed), **không phải** cứu vấn đề "mất chỗ đang đọc". Trên
mobile modal gần như không thêm gì so với hiện tại. Cần nhớ điều này khi cân
nhắc công sức.

## Hai ràng buộc không thể làm đúng như mong muốn ban đầu

### 1. "Chỉ desktop" không tồn tại ở tầng route

Intercepting route quyết định theo **URL**, không theo kích thước màn hình.
Server render không biết viewport nên không có cách nào để "trên mobile thì
đừng intercept".

| Lối ra | Phán quyết |
|---|---|
| Dùng `<a>` thường trên mobile để ép hard navigation | **Loại** — tải lại cả trang, mất cảm giác mượt. |
| Vào modal rồi `router.replace` sang trang thật nếu màn hình nhỏ | **Loại** — nháy một nhịp, và phải đoán viewport ở client sau khi đã render. |
| **Một route, hai cách trình bày bằng CSS thuần** | **Chọn** — không JS đoán viewport nên không lệch hydration. |

Cụ thể: từ `lg` trở lên = overlay có backdrop, ảnh lớn bên trái + bình luận cột
phải. Dưới `lg` = tấm full-screen `fixed inset-0 bg-background`, nhìn **y như**
một trang. Trên mobile người dùng vẫn "vào modal" nhưng nó trông và hành xử như
trang hiện tại (back đóng lại, vị trí cuộn giữ nguyên).

### 2. Hành trình và Góc đọc cũng bị intercept

Interception bắt theo URL `/m/[slug]`; route **không có cách nào từ chối** một
bài cụ thể. Nên không thể để Khoảnh khắc ra modal còn Hành trình sang trang —
cùng một URL.

Xử lý: route modal đọc bài rồi tự chọn cách trình bày.

- `khoanh_khac` **và** màn hình `lg`+ → bố cục ảnh-lớn / bình-luận-cột-bên.
- **Mọi trường hợp còn lại** (Hành trình, Góc đọc, hoặc màn hình nhỏ) → cách
  trình bày dạng trang, full-screen.

Nhờ vậy bài Hành trình (có bài 19 chặng, mỗi chặng ảnh + ngày + ghi chú) không
bao giờ bị nhét vào popup hẹp thành cuộn-trong-cuộn.

## Thứ tự thực hiện

### Bước 0 — phép thử quyết định sống chết (làm TRƯỚC mọi thứ)

Dựng bộ khung route **rỗng** (`@modal/default.tsx` trả `null`, `app/default.tsx`,
`layout.tsx` nhận prop `modal`, route intercept render một `<div>` trống), rồi
chạy `npm run build` và xem **`/` còn ký hiệu `○ (Static)` hay không**.

`/` đang là ISR 300s và là trang quan trọng nhất của site. Nếu việc thêm
parallel route vào layout gốc đẩy nó sang `ƒ (Dynamic)` thì cái giá quá đắt cho
một nâng cấp desktop — **đề nghị dừng tính năng**, không tìm cách lách. Không
viết một dòng UI nào trước khi bước này pass.

Cũng trong bước này: xác định `(.)` hay `(..)`. Quy ước tính theo **route
segment** chứ không theo thư mục, và `@modal` không phải segment. Feed ở root
nên dự đoán là `(.)`, nhưng phải chạy mới biết.

### Bước 1 — tách `PostDetail`

Tách phần render bài khỏi `src/app/m/[slug]/page.tsx` (253 dòng, gồm cả logic
tỉ lệ ảnh, gallery, hành trình) thành `src/components/post/PostDetail.tsx`.

**Bắt buộc làm trước UI modal**: trang thật và modal phải dùng **một**
component, không thì sẽ có hai bản render bài và chúng sẽ lệch nhau sau vài lần
sửa.

Component nhận thêm prop `mediaMode`:

- `"lightbox"` (trang thật) — ảnh bọc `Lightbox` như hiện nay.
- `"plain"` (modal) — dùng `ImageBlur` trực tiếp. Vì bản thân modal đã là
  lightbox, đây là chỗ gỡ hẳn vấn đề **modal lồng modal**: nếu để nguyên, trong
  modal chạm ảnh sẽ mở Lightbox → hai overlay chồng nhau, hai focus-trap tranh
  nhau, Esc không biết đóng cái nào.

Sau bước này `m/[slug]/page.tsx` chỉ còn lo data fetching + metadata.

### Bước 2 — primitive overlay

`src/components/ui/` — Esc đóng, bấm backdrop đóng, khoá scroll body,
focus-trap, **trả focus về phần tử vừa bấm khi đóng**, fade tĩnh.
`src/components/ui/Lightbox.tsx` **đã có sẵn** các hành vi này nhưng gắn chặt
vào một tấm ảnh; phần dùng chung được **tách ra** chứ không viết mới, và
`Lightbox` chuyển sang dùng nó để không tồn tại hai cách khoá scroll khác nhau.

Bất biến: hover chỉ đổi màu/viền, không chuyển động; không spinner quay; mọi
fade gác sau `prefers-reduced-motion`.

### Bước 3 — route và bố cục

```
src/app/
  layout.tsx              ← nhận thêm prop `modal`
  default.tsx             ← mới (children slot khi hard navigation)
  @modal/
    default.tsx           ← trả null (không render modal khi không active)
    (.)m/[slug]/page.tsx  ← đọc bài + bình luận, render overlay
  m/[slug]/page.tsx       ← GIỮ NGUYÊN đường đi, chỉ gọi PostDetail
```

`default.js` là bắt buộc: khi hard navigation, Next không dựng lại được trạng
thái của slot không khớp URL và sẽ **render 404** nếu thiếu file này.

## Được kèm miễn phí

URL vẫn đổi nên vẫn chia sẻ được; bấm back đóng modal thay vì rời trang;
forward mở lại modal; F5 ra trang đầy đủ.

## Rủi ro / câu chưa trả lời được

| Câu hỏi | Cách giải quyết |
|---|---|
| Thêm `@modal` có làm `/` mất tĩnh? | Bước 0. Nếu mất → dừng tính năng. |
| `(.)` hay `(..)`? | Bước 0, chạy mới biết. |
| Plausible có đếm pageview khi điều hướng mềm? | Kiểm sau khi dựng xong; nếu không đếm thì chấp nhận (analytics không cookie, không phải mục tiêu chính) hoặc bỏ hẳn, KHÔNG thêm script theo dõi mới. |
| Mỗi bài có thêm một biến thể prerender | Build dài hơn chút. Không tốn tiền (Hobby). Chấp nhận. |

## Kiểm chứng

Gate CI, chạy thật: `npm run lint` → `npx tsc --noEmit` → `npm run build`
(và đọc bảng route để xác nhận `/` vẫn `○`).

Kiểm bằng tay:

1. Desktop: bấm bài Khoảnh khắc từ feed → overlay ảnh lớn + bình luận cột bên,
   URL đổi.
2. Bấm back → modal đóng, feed về **đúng vị trí cuộn** cũ.
3. **F5 khi đang mở modal → ra trang đầy đủ, KHÔNG có modal.**
4. Dán URL vào cửa sổ mới → trang đầy đủ.
5. Gửi link qua Messenger → thẻ OG vẫn đúng ảnh/tiêu đề.
6. Bài Hành trình → không ra popup hẹp (dùng cách trình bày dạng trang).
7. Mobile: bấm bài → tấm full-screen, back đóng, giữ vị trí cuộn.
8. Bàn phím: Tab không lọt ra sau backdrop; Esc đóng; trả focus về card vừa bấm.
9. `prefers-reduced-motion` bật → không có fade.

## Bất biến đã kiểm, không bị chạm

Tim vẫn ẩn danh; `heart_counts` không đổi; danh sách cột tường minh trong
`src/lib/db/comments.ts` không đổi; không hardcode hex tâm trạng; service-role
key không rời server.

Video: modal dùng chung `PostDetail` nên thừa hưởng **autoplay MUTED + nút
"Bật tiếng"** y như trang detail — modal *là* cách xem chi tiết, không phải
feed, nên đây đúng bất biến chứ không phải ngoại lệ. Feed vẫn chạm-mới-phát.
