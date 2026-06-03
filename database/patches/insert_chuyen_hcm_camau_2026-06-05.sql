-- Chạy trên Railway MySQL (HeidiSQL) để thêm chuyến TP.HCM -> Cà Mau ngày 05/06/2026.
-- Tuyến: tuyen_xe_id = 43 (TP. Hồ Chí Minh - Cà Mau). Bỏ qua nếu đã chạy rồi.

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 1, '2026-06-05', '00:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '00:00:00'
);

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 2, '2026-06-05', '06:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '06:00:00'
);

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 3, '2026-06-05', '08:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '08:00:00'
);

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 1, '2026-06-05', '10:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '10:00:00'
);

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 2, '2026-06-05', '12:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '12:00:00'
);

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 3, '2026-06-05', '14:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '14:00:00'
);

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 1, '2026-06-05', '16:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '16:00:00'
);

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 2, '2026-06-05', '18:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '18:00:00'
);

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 3, '2026-06-05', '20:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '20:00:00'
);

INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai)
SELECT 43, 1, '2026-06-05', '22:00:00', 220000.00, 'CHUA_KHOI_HANH' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM ChuyenXe WHERE tuyen_xe_id = 43 AND ngay_di = '2026-06-05' AND gio_di = '22:00:00'
);
