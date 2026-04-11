# Hướng dẫn kiểm thử API (BanVeXe Backend)

Tài liệu này mô tả cách gọi API REST của module Spring Boot (`backend-springboot`), bao gồm Postman, biến môi trường và vài lệnh `curl` mẫu.

## Điều kiện

1. Đã chạy MariaDB/MySQL, tạo database và nạp dữ liệu từ `database/data.sql` (tên DB mặc định trong script: `QuanLyVeXe`).
2. `application.yml` trùng **URL**, **user**, **password** và **tên database** với máy của bạn (driver: MariaDB).
3. Ứng dụng đang chạy (mặc định `http://localhost:8080`).

## Xác thực JWT

- Header: `Authorization: Bearer <accessToken>`
- Token lấy từ `POST /api/auth/login` (trường `accessToken` trong JSON).
- Vai trò trong token quyết định quyền:
  - `KHACH_HANG` → `/api/me/booking/**`, `/api/accounts/me/**`, `/api/auth/me`
  - `NHAN_VIEN` hoặc `QUAN_TRI` → `/api/staff/**`
  - `QUAN_TRI` → `/api/admin/**`, `/api/manager/**`

**Lưu ý đăng ký mới:** Sau `POST /api/auth/register`, tài khoản ở trạng thái chưa kích hoạt. Cần `POST /api/auth/verify-email` với OTP. Trong môi trường dev, OTP được in ra **console** của ứng dụng (xem log `=== OTP FOR TESTING ===`), kể cả khi gửi email thất bại.

**Lưu ý tài khoản seed trong `data.sql`:** Cột `mat_khau` trong file SQL là hash kiểu cũ (MD5). Ứng dụng đăng nhập bằng **BCrypt**. Để test nhanh, nên dùng luồng **đăng ký → xác thực OTP → đăng nhập** thay vì dựa vào mật khẩu mẫu trong SQL (trừ khi bạn đã cập nhật hash trong DB cho đúng BCrypt).

## Import collection Postman

1. Mở Postman → **Import** → chọn file:
   - `backend-springboot/postman/BanVeXe-Account-Module.postman_collection.json`
2. Trong collection, chỉnh biến:
   - `baseUrl` = `http://localhost:8080` (hoặc host bạn deploy)
3. Chạy lần lượt:
   - **Health** → kiểm tra backend sống
   - **Đăng nhập** → copy `accessToken` vào biến `tokenKhach` hoặc `tokenAdmin` tùy vai trò
   - Các folder còn lại (catalog, booking, staff, manager, admin)

Collection đã gắn sẵn header `Authorization: Bearer {{tokenKhach}}` / `{{tokenAdmin}}` cho các request cần JWT.

## Endpoint tóm tắt (theo `SecurityConfig`)

| Nhóm | Method & path | JWT |
|------|----------------|-----|
| Auth | `POST /api/auth/register`, `/login`, `/verify-email`, `/resend-otp` | Không |
| Health | `GET /api/accounts/health` | Không |
| Catalog | `GET /api/catalog/**` | Không |
| Tài khoản (đã đăng nhập) | `PUT /api/accounts/me/profile`, `/password` | Có |
| Auth profile | `GET /api/auth/me` | Có |
| Khách — đặt vé | `POST/GET ... /api/me/booking/**` | Có, role `KHACH_HANG` |
| Nhân viên | `/api/staff/**` | Có, `NHAN_VIEN` hoặc `QUAN_TRI` |
| Quản trị — tuyến/chuyến | `/api/manager/**` | Có, `QUAN_TRI` |
| Quản trị — tài khoản | `/api/admin/**` | Có, `QUAN_TRI` |

Các route khác mặc định **403/401** theo cấu hình bảo mật.

## Ví dụ `curl`

**Health check**

```bash
curl -s http://localhost:8080/api/accounts/health
```

**Danh sách tuyến (công khai)**

```bash
curl -s "http://localhost:8080/api/catalog/routes"
```

**Đăng nhập**

```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"you@example.com\",\"password\":\"yourpassword\"}"
```

**Gọi API có JWT (ví dụ thông tin tôi)**

```bash
curl -s http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Swagger

Hiện project **chưa** bật SpringDoc/Swagger trong `pom.xml`. Khi cần tài liệu OpenAPI tự động, có thể bổ sung dependency `springdoc-openapi-starter-webmvc-ui` và cấu hình sau.
