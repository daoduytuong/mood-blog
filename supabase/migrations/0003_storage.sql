-- Mood Blog — Story 1.5: Storage bucket cho ảnh Khoảnh khắc.
-- Bucket public (đọc công khai qua CDN), chỉ tài khoản đã đăng nhập (Tác giả) được upload.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Đọc công khai: bucket public=true đã cho đọc qua /object/public/. Policy SELECT cho chắc.
create policy "media public read" on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Upload: chỉ authenticated (app này 1 Tác giả) được INSERT vào bucket media.
create policy "media author upload" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'media');

-- (Tùy chọn) cho phép Tác giả xoá/ghi đè file của mình — phục vụ sửa/xoá bài sau (Story 1.7).
create policy "media author update" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

create policy "media author delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'media');
