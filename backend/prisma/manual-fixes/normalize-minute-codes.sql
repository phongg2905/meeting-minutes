-- Chạy một lần khi cần đồng bộ lại mã biên bản đã lưu trong DB.
-- Khóa chính và các bảng liên quan vẫn dùng minute_id, nên thao tác này chỉ đổi mã hiển thị minute_code.
--
-- Quy ước mới:
--   BB-YYYYMM-0001
-- Trong đó YYYYMM lấy theo created_at, còn 0001 là minute_id được thêm số 0 phía trước.

BEGIN;

UPDATE meeting_minutes
SET minute_code = concat(
  'BB-',
  to_char(created_at, 'YYYYMM'),
  '-',
  lpad(minute_id::text, 4, '0')
);

COMMIT;