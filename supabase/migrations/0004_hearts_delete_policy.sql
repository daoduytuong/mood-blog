-- Story 3.2: gỡ tim (best-effort). App xoá theo (post_id, anon_id) của chính mình.
-- anon_id là UUID KHÔNG đọc được (RLS chặn anon SELECT hearts) -> không đoán được anon_id người khác.
-- => `using (true)` an toàn ở mức "đủ tốt cho hobby": chỉ xoá được dòng mình biết (của mình).
create policy hearts_anon_delete on hearts
  for delete
  to anon, authenticated
  using (true);
