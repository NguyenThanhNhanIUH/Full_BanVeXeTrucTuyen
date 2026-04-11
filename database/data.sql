-- =======================================================
-- 1. TẠO DATABASE VÀ CÁC BẢNG (SCHEMA)
-- =======================================================
CREATE DATABASE IF NOT EXISTS QuanLyVeXe DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE QuanLyVeXe;

-- BẢNG TÀI KHOẢN (Users)
CREATE TABLE tai_khoan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    so_dien_thoai VARCHAR(15) UNIQUE,
    mat_khau VARCHAR(255) NOT NULL,
    ho_ten VARCHAR(100) NOT NULL,
    vai_tro ENUM('KHACH_HANG', 'NHAN_VIEN', 'QUAN_TRI') DEFAULT 'KHACH_HANG',
    trang_thai ENUM('ACTIVE', 'INACTIVE', 'DELETED') DEFAULT 'ACTIVE'
);

-- BẢNG XE (Buses)
CREATE TABLE Xe (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bien_so VARCHAR(20) UNIQUE NOT NULL,
    loai_xe VARCHAR(50) NOT NULL, 
    so_ghe INT NOT NULL
);

-- BẢNG TUYẾN XE (Routes)
CREATE TABLE TuyenXe (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ten_tuyen VARCHAR(255) NOT NULL,
    diem_di VARCHAR(100) NOT NULL,
    diem_den VARCHAR(100) NOT NULL,
    khoang_cach DECIMAL(10,2), 
    thoi_gian_du_kien INT, 
    gia_ve_co_ban DECIMAL(10,2) NOT NULL,
    trang_thai ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);

-- BẢNG CHUYẾN XE (Trips)
CREATE TABLE ChuyenXe (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tuyen_xe_id INT NOT NULL,
    xe_id INT NOT NULL,
    ngay_di DATE NOT NULL,
    gio_di TIME NOT NULL,
    gia_ve DECIMAL(10,2) NOT NULL,
    trang_thai ENUM('CHUA_KHOI_HANH', 'DANG_CHAY', 'HOAN_THANH', 'HUY_CHUYEN') DEFAULT 'CHUA_KHOI_HANH',
    FOREIGN KEY (tuyen_xe_id) REFERENCES TuyenXe(id),
    FOREIGN KEY (xe_id) REFERENCES Xe(id)
);

-- BẢNG VÉ XE / ĐƠN ĐẶT VÉ (Tickets)
CREATE TABLE VeXe (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_ve VARCHAR(20) UNIQUE NOT NULL, 
    khach_hang_id INT NOT NULL,
    chuyen_xe_id INT NOT NULL,
    ngay_dat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    so_luong_ghe INT NOT NULL,
    tong_tien DECIMAL(10,2) NOT NULL,
    trang_thai ENUM('CHO_THANH_TOAN', 'DA_THANH_TOAN', 'DANG_XU_LY', 'DA_HUY', 'HOAN_THANH') DEFAULT 'CHO_THANH_TOAN',
    ghi_chu TEXT,
    FOREIGN KEY (khach_hang_id) REFERENCES tai_khoan(id),
    FOREIGN KEY (chuyen_xe_id) REFERENCES ChuyenXe(id)
);

-- BẢNG CHI TIẾT VÉ / GHẾ (Ticket_Details)
CREATE TABLE ChiTietVe (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ve_xe_id INT NOT NULL,
    so_ghe VARCHAR(10) NOT NULL, 
    FOREIGN KEY (ve_xe_id) REFERENCES VeXe(id) ON DELETE CASCADE,
    UNIQUE KEY (ve_xe_id, so_ghe) 
);

-- BẢNG THANH TOÁN (Payments)
CREATE TABLE ThanhToan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ve_xe_id INT NOT NULL,
    so_tien DECIMAL(10,2) NOT NULL,
    phuong_thuc ENUM('THE', 'VI_DIEN_TU', 'CHUYEN_KHOAN') NOT NULL,
    ma_giao_dich VARCHAR(100), 
    trang_thai ENUM('DANG_XU_LY', 'THANH_CONG', 'THAT_BAI') DEFAULT 'DANG_XU_LY',
    ngay_thanh_toan TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ve_xe_id) REFERENCES VeXe(id)
);
-- =======================================================
-- 2. THÊM DỮ LIỆU MẪU (MOCK DATA)
-- =======================================================

-- Dữ liệu mẫu bảng tai_khoan
INSERT INTO tai_khoan (email, so_dien_thoai, mat_khau, ho_ten, vai_tro, trang_thai) VALUES
('admin.baoxuyen@gmail.com', '0901234567', 'e10adc3949ba59abbe56e057f20f883e', 'Trần Bảo Xuyên', 'QUAN_TRI', 'ACTIVE'),
('khachhang.a@gmail.com', '0923456789', 'e10adc3949ba59abbe56e057f20f883e', 'Nguyễn Văn A', 'KHACH_HANG', 'ACTIVE'),
('khachhang.b@gmail.com', '0934567890', 'e10adc3949ba59abbe56e057f20f883e', 'Trần Thị B', 'KHACH_HANG', 'ACTIVE');

-- Dữ liệu mẫu bảng Xe
INSERT INTO Xe (bien_so, loai_xe, so_ghe) VALUES
('51B-123.45', 'Giường nằm 40 chỗ', 40),
('51B-678.90', 'Giường nằm 40 chỗ', 40),
('51F-112.23', 'Limousine 9 chỗ', 9);

-- Dữ liệu mẫu bảng TuyenXe
INSERT INTO TuyenXe (ten_tuyen, diem_di, diem_den, khoang_cach, thoi_gian_du_kien, gia_ve_co_ban, trang_thai) VALUES
('Sài Gòn - Đà Lạt', 'TP. Hồ Chí Minh', 'Đà Lạt', 300.00, 420, 250000.00, 'ACTIVE'),
('Sài Gòn - Nha Trang', 'TP. Hồ Chí Minh', 'Nha Trang', 400.00, 540, 300000.00, 'ACTIVE');

-- Dữ liệu mẫu bảng ChuyenXe
INSERT INTO ChuyenXe (tuyen_xe_id, xe_id, ngay_di, gio_di, gia_ve, trang_thai) VALUES
(1, 1, '2026-04-20', '22:00:00', 250000.00, 'CHUA_KHOI_HANH'),
(1, 3, '2026-04-20', '23:30:00', 350000.00, 'CHUA_KHOI_HANH'),
(2, 2, '2026-04-21', '20:00:00', 300000.00, 'CHUA_KHOI_HANH');

-- Dữ liệu mẫu bảng VeXe
INSERT INTO VeXe (ma_ve, khach_hang_id, chuyen_xe_id, so_luong_ghe, tong_tien, trang_thai, ghi_chu) VALUES
('VX20260410_001', 2, 1, 2, 500000.00, 'DA_THANH_TOAN', 'Khách đón tại BX Miền Đông'),
('VX20260410_002', 3, 2, 1, 350000.00, 'CHO_THANH_TOAN', NULL),
('VX20260411_003', 2, 3, 3, 900000.00, 'DA_HUY', 'Khách hàng có việc bận đột xuất');

-- Dữ liệu mẫu bảng ChiTietVe
INSERT INTO ChiTietVe (ve_xe_id, so_ghe) VALUES
(1, 'A01'), (1, 'A02'), 
(2, 'A01'),            
(3, 'B01'), (3, 'B02'), (3, 'B03'); 

-- Dữ liệu mẫu bảng ThanhToan
INSERT INTO ThanhToan (ve_xe_id, so_tien, phuong_thuc, ma_giao_dich, trang_thai) VALUES
(1, 500000.00, 'VI_DIEN_TU', 'MOMO123456789', 'THANH_CONG'),
(3, 900000.00, 'CHUYEN_KHOAN', 'FT2026411998877', 'THANH_CONG');