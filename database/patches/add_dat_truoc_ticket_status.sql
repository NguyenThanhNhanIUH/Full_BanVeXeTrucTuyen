-- Bảng thật là `vexe` (chữ thường). `VeXe` trên Railway thường là VIEW — không ALTER được.
ALTER TABLE vexe
  MODIFY COLUMN trang_thai ENUM(
    'CHO_THANH_TOAN',
    'DAT_TRUOC',
    'DA_THANH_TOAN',
    'DANG_XU_LY',
    'DA_HUY',
    'HOAN_THANH'
  ) DEFAULT 'CHO_THANH_TOAN';

-- han_thanh_toan: backend tự thêm khi khởi động (DeferredBookingSchemaRunner).
