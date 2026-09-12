---
title: "Nháp — lưu bài chưa đăng, đăng sau"
date: 2026-09-11
status: approved
supersedes: "_bmad-output/enhancement-roadmap-2026-06-06.md mục D7 (và thay cho B6/D4 — nháp localStorage)"
---

# Nháp — lưu bài chưa đăng, đăng sau

## Vì sao

Hiện `/compose` chỉ có một đường ra: bấm Đăng là bài công khai ngay
(`is_published` mặc định `true`, không có luồng nào đặt `false`). Với một blog
cảm xúc, thứ viết lúc đang có cảm xúc không phải lúc nào cũng là thứ muốn để
người khác đọc ngay. Nháp cho phép viết xong rồi lắng lại, sửa, và tự quyết
định thời điểm đăng.

## Quyết định đã chốt

| Câu hỏi | Quyết định | Vì sao |
|---|---|---|
| Nháp lưu ở đâu | Row `posts` với `is_published = false` | Cần sửa được ảnh, mà ảnh phải nằm trên Storage → buộc có row DB. Nháp localStorage (B6 roadmap cũ) bị loại vì lý do này. |
| Xem trước nháp như bài thật | **Không** | `/m/[slug]` đang SSG + `generateStaticParams`; trộn đường đọc theo session vào đó sẽ đẩy route sang dynamic hoặc sinh cache lệch theo người xem. |
| Slug sinh khi nào | **Sinh lại lúc Đăng** | Nháp lưu khi caption còn trống sẽ dính slug rác vĩnh viễn. Bài chưa từng công khai nên đổi slug không gãy link/OG/sitemap. |
| Sửa ảnh trong nháp | **Có**, chỉ với bài chưa đăng | "Lắng lại" thường là để bỏ một tấm. Bài đã đăng giữ nguyên luật cũ: không đổi ảnh. |
| Định danh nháp trên URL | Theo `id`, route riêng `/me/nhap/[id]` | Nháp chưa có URL công khai thì không nên định danh bằng slug. Giữ bất biến "bài đã đăng không đổi ảnh" theo **cấu trúc route**, không theo cờ điều kiện trong một form dùng chung. |

### Không làm (để khỏi ngầm hiểu)

- Lên lịch đăng tự động.
- Tự lưu nháp theo từng phím gõ — "Lưu nháp" là hành động chủ động.
- Nháp cho bình luận.
- Job dọn nháp cũ định kỳ (xem *Hạn chế đã biết*).
- Thêm chặng Hành trình khi còn là nháp — nháp Hành trình chỉ có chặng đầu.

## Bảo mật — không cần migration

`supabase/migrations/0002_rls.sql` đã đủ:

- `posts_public_read` là `using (is_published)` → bài `is_published = false`
  **không đọc được** bằng anon key. Mọi đường đọc công khai (`/`, `/m/[slug]`,
  `/lich`, `/tam-trang/[mood]`, sitemap) đều qua `createPublicClient()` nên
  nháp tự vô hình.
- `posts_author_all` (`auth.uid() = author_id`) cho tác giả toàn quyền với nháp
  của mình qua client gắn cookie.
- `0007_comments_hardening.sql` đã chặn bình luận theo `is_published`;
  `heart_counts` (0010) chỉ đếm bài đã publish.

**Không thêm policy, không thêm cột, không migration.**

## Thay đổi theo tầng

### `src/lib/db/posts.ts`

- `slugExists(sb, slug): Promise<boolean>` — **mới**. Không lọc
  `is_published`. Sửa một nợ đang có: `uniqueSlug()` kiểm trùng bằng
  `getBySlug()` vốn lọc `is_published = true`, nên không thấy slug của nháp và
  có thể sinh slug trùng. `uniqueSlug` chuyển sang dùng hàm này.
  *Giới hạn đã biết:* chạy bằng client của tác giả nên RLS chỉ cho thấy nháp
  **của chính tác giả**. Blog một người nên không thành vấn đề; trường hợp
  nhiều tác giả, ràng buộc `slug unique` ở DB vẫn là chốt cuối (insert sẽ lỗi
  và action trả lỗi tử tế).
- `getByIdForAuthor(sb, id): Promise<Post | null>` — **mới**. Đọc một bài của
  tác giả kể cả nháp; RLS lo phần quyền.
- `publishPost(sb, id, slug): Promise<void>` — **mới**. Hàm **duy nhất** được
  đổi `slug` + `is_published`. Cố ý không nhồi hai cột này vào `updatePost`:
  như vậy trong codebase không tồn tại đường nào đổi slug của bài đã đăng,
  thay vì phải nhớ tự kiềm chế.
- `listByAuthor` — **không sửa**. Đã trả mọi bài của tác giả, và `Post` đã có
  `isPublished`, nên tách ở tầng gọi là đủ.

### `src/features/compose/actions.ts`

- `saveDraft(prev, formData)` — **mới**. Tạo post `is_published: false`. Slug
  tạm **luôn** dạng `nhap-<base36>`: gọi `uniqueSlug(sb, "", "nhap")` với hint
  RỖNG, cố ý không truyền caption — slug sẽ được sinh lại lúc đăng nên sinh
  theo caption ở đây chỉ tạo ra hai slug khác nhau cho cùng một bài.
  Dùng lại `sanitizeImageMedia` (đã khử `alt`, `path` theo namespace user,
  `blurDataURL` capped).
  **Không `revalidatePath` nào**: nháp không xuất hiện ở trang công khai nào,
  và `/me` là `force-dynamic`.
- `updateDraft(prev, formData)` — **mới**. Sửa caption/excerpt/link/mood +
  media (thêm/bớt/đổi). **Từ chối nếu `existing.isPublished === true`** — bất
  biến "bài đã đăng không đổi ảnh" được giữ bằng kiểm tra ở server, không chỉ
  bằng việc UI không hiện nút. Dọn Storage cho ảnh bị bỏ (so `path` cũ với
  mới, `remove()` phần dư) **sau khi** DB đã lưu.
- `publishDraft(prev, formData)` — **mới**. Sinh slug thật theo **đúng quy tắc
  của luồng tạo hiện tại**: Khoảnh khắc và Hành trình lấy hint từ `caption`,
  Góc đọc lấy `excerpt || caption` (khớp `createGocDoc`). Rồi gọi
  `publishPost`, `revalidatePath("/")` + `revalidatePath("/m/<slug>")`,
  redirect sang bài. Từ chối nếu bài đã đăng.
- `deletePostAction(formData)` — **sửa**. Hiện đọc bài bằng `getBySlug(slug)`
  vốn lọc `is_published = true` → **sẽ không xoá nổi nháp**. Đổi sang
  `getByIdForAuthor(id)` (`id` vốn đã có trong form). Redirect về `/me` nếu
  bài là nháp, về `/` nếu đã đăng; và bỏ qua `revalidatePath` khi xoá nháp —
  không có trang công khai nào từng chứa nó.

### UI

- **`src/app/me/nhap/[id]/page.tsx`** — **mới**. `force-dynamic`. Đọc
  `getByIdForAuthor`; `notFound()` nếu không tìm thấy, không phải của mình,
  **hoặc đã đăng**. Render `<ComposeForm draft={...} />`.
  Không sửa `proxy.ts`: `PROTECTED = ["/compose", "/me"]` dùng `startsWith`
  nên `/me/nhap/[id]` đã được bảo vệ.
- **`src/features/compose/ComposeForm.tsx`** — nhận prop `draft?`:
  - Có `draft`: khoá bộ chọn loại bài (giữ luật không đổi loại), nạp giá trị
    ban đầu, hai nút "Lưu nháp" + "Đăng".
  - Không có `draft` (soạn mới): thêm nút "Lưu nháp" cạnh "Đăng".
  - **Phần rủi ro cao nhất của cả tính năng**: form phải hiện *ảnh đã lưu trên
    Storage* lẫn *ảnh mới vừa chọn* trong cùng một danh sách. Hiện chỉ có
    `Picked = { file, url, alt }`. Cần thêm dạng "ảnh đã lưu"
    (`path`, `w`, `h`, `blurDataURL`, `alt`) và một danh sách hợp nhất để xoá,
    sắp thứ tự và nhập `alt` hoạt động đồng nhất trên cả hai dạng. Ảnh đã lưu
    hiển thị qua `mediaPublicUrl(path)`; ảnh mới qua blob URL (vẫn phải
    `revokeObjectURL` như hiện nay).
- **`src/app/me/page.tsx`** — khu "Nháp" phía trên lưới bài; lưới bài và dải
  thống kê chỉ tính bài đã đăng; `MemoriesSection` nhận danh sách đã lọc
  published (kỷ niệm phải là thứ đã từng đăng).

## Xử lý lỗi

| Tình huống | Hành vi |
|---|---|
| Upload ảnh xong nhưng lưu nháp thất bại | `remove()` ảnh vừa upload, trả lỗi tiếng Việt dịu — như các action hiện có. |
| Bỏ ảnh khỏi nháp | Lưu DB trước, `remove()` best-effort sau (thứ tự đang dùng ở `updateJourneyEntry`): hụt dọn thì thành rác, ngược lại thì bài trỏ vào ảnh đã mất. |
| Xoá nháp | Dọn ảnh rồi xoá row. |
| Sửa/đăng một bài đã đăng qua action nháp | Action từ chối, trả lỗi. |
| Nháp không phải của mình | `notFound()` ở route; RLS là chốt cuối. |

## Hạn chế đã biết

- **Nháp bị bỏ quên nằm đó mãi.** Không có job dọn định kỳ — job tự xoá bài
  người ta viết dở là hành vi tệ hơn việc để nó nằm yên. Ảnh của nháp vẫn tính
  vào quota Storage.
- `slugExists` chỉ thấy nháp của chính tác giả (xem trên).

## Kiểm chứng

Gate CI, chạy thật và đọc output: `npm run lint` → `npx tsc --noEmit` →
`npm run build`.

Kiểm bằng tay, theo đúng thứ tự:

1. Lưu nháp một bài 2 ảnh → `/me` hiện khu "Nháp"; feed `/` **không** thấy.
2. **Phép thử quan trọng nhất**: mở `/m/<slug-tạm>` ở cửa sổ đã đăng xuất →
   phải ra **404** (nháp không lọt ra công khai).
3. Sửa nháp: bỏ 1 ảnh, đổi caption, đổi mood → lưu → mở lại thấy đúng.
4. Đăng → slug khớp caption mới, bài lên feed, có ở `/lich` và sitemap.
5. Xoá một nháp khác → row biến mất, ảnh không còn trên Storage.

## Bất biến đã kiểm, không bị chạm

Tim vẫn ẩn danh (`anon_id` không lộ, không mở SELECT trên `hearts`);
`heart_counts` không đổi; danh sách cột tường minh trong `src/lib/db/comments.ts`
không đổi; không hardcode hex tâm trạng; không spinner quay; hover không
chuyển động; service-role key không rời server.
