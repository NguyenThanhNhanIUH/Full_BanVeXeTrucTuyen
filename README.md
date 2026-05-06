# BanVeXe — Hệ thống bán vé xe trực tuyến

## Giới thiệu

**BanVeXe** là backend REST cho hệ thống đặt vé xe: quản lý tài khoản (đăng ký, OTP email, JWT), tra cứu tuyến/chuyến, đặt vé và thanh toán nội bộ, phân quyền khách hàng / nhân viên / quản trị.

### Thông tin dự án

- **Mô tả:** Quản lý bán vé xe trực tuyến (API Spring Boot)
- **Phát triển:** Nguyễn Thành Nhân, Trần Bảo Xuyên
- **Hướng dẫn:** ThS. Đặng Văn Thuận
- **Đơn vị:** Trường Đại học Công nghiệp TP.HCM — Khoa CNTT

## Kiến trúc & vai trò

Ba vai trò chính:

- **Khách hàng:** tra cứu catalog, đặt vé, thanh toán, hủy vé, hồ sơ cá nhân
- **Nhân viên:** danh sách vé, cập nhật vé, duyệt hủy, cập nhật trạng thái chuyến
- **Quản trị:** CRUD tuyến/chuyến, quản lý nhân viên, xem khách hàng

### Cấu trúc thư mục backend

```
backend-springboot/
├── postman/                          # Collection Postman
├── docs/
│   └── API_TESTING.md                # Hướng dẫn test API (chi tiết)
├── src/main/java/com/banvexe/accountmanagement/
│   ├── controller/                   # REST: auth, catalog, booking, admin, staff, manager
│   ├── service/                      # Nghiệp vụ + booking/
│   ├── entity/                     # JPA (UserAccount, TuyenXe, ChuyenXe, VeXe, …)
│   ├── repository/
│   ├── dto/
│   ├── security/                     # JWT filter, SecurityConfig
│   └── config/                       # GlobalExceptionHandler
└── src/main/resources/
    └── application.yml
```

## Chức năng chính (theo mã nguồn hiện tại)

- **Xác thực:** đăng ký, OTP xác thực email, đăng nhập JWT, xem hồ sơ (`/api/auth/me`), đổi mật khẩu / cập nhật hồ sơ
- **Catalog (công khai):** danh sách tuyến, chuyến, chi tiết chuyến, sơ đồ ghế
- **Khách:** đặt vé, thanh toán (phương thức trong hệ thống: thẻ, ví điện tử, chuyển khoản — enum nội bộ), xem/hủy vé
- **Nhân viên:** quản lý vé, duyệt hủy, cập nhật trạng thái chạy chuyến
- **Quản trị:** CRUD tuyến/chuyến; quản lý tài khoản nhân viên; xem danh sách/chi tiết khách

## Công nghệ

| Thành phần | Công nghệ |
|------------|-----------|
| Runtime | Java **17** |
| Framework | Spring Boot **3.5** (Web, Security, Data JPA, Validation, Mail) |
| Database | **MariaDB** / MySQL (driver `mariadb-java-client`); kèm **H2** trên classpath (có thể dùng cho thử nghiệm nếu cấu hình profile) |
| Bảo mật | JWT (jjwt), BCrypt, stateless session |
| Build | Maven |

## Cài đặt & chạy

### Yêu cầu

- JDK **17+**
- **MariaDB** hoặc MySQL tương thích
- Maven **3.6+**

### 1. Clone và vào thư mục backend

```bash
git clone <repository-url>
cd BackEnd_BanVeXeTrucThuyen
```

### 2. Tạo database và dữ liệu mẫu

```bash
mysql -u root -p
```

Trong MySQL/MariaDB client:

```sql
SOURCE database/data.sql;
```

Script tạo database **`QuanLyVeXe`** (chú ý phân biệt hoa thường tùng hệ điều hành). Tên database trong `application.yml` phải trùng với DB bạn đã tạo.

### 3. Cấu hình `application.yml`

File: `backend-springboot/src/main/resources/application.yml`

- **`spring.datasource`:** `url`, `username`, `password` trỏ tới MariaDB/MySQL của bạn.
- **`spring.jpa.hibernate.ddl-auto`:** hiện đặt **`validate`** — schema do script SQL quản lý; đổi sang `update` chỉ khi bạn chủ động dùng Hibernate tạo/cập nhật bảng.
- **`app.jwt.secret`:** dùng chuỗi bí mật đủ dài trong môi trường thật (không commit secret production).
- **`app.jwt.expiration-minutes`:** thời hạn token (mặc định 1440 phút).
- **`spring.mail`:** cấu hình Gmail (app password) nếu muốn gửi OTP qua email; khi lỗi SMTP, OTP vẫn in ra console khi chạy local (xem `docs/API_TESTING.md`).

Ví dụ khối JWT và server (rút gọn):

```yaml
server:
  port: 8080

app:
  jwt:
    secret: <thay-bằng-chuỗi-bí-mật-64-ký-tự-hex-hoặc-tương-đương>
    expiration-minutes: 1440
```

### 4. Chạy ứng dụng

```bash
cd backend-springboot
mvn spring-boot:run
```

Hoặc chạy class `com.banvexe.accountmanagement.AccountManagementApplication` trong IDE.

API mặc định: **http://localhost:8080**

## Kiểm thử API

- **Hướng dẫn chi tiết:** [backend-springboot/docs/API_TESTING.md](backend-springboot/docs/API_TESTING.md) — Postman, biến `baseUrl` / token, bảng endpoint, `curl`, lưu ý OTP và tài khoản seed.
- **Collection Postman:** import `backend-springboot/postman/BanVeXe-Account-Module.postman_collection.json`.

Tóm tắt: endpoint công khai gồm `/api/auth/register`, `/api/auth/login`, `/api/auth/verify-email`, `/api/auth/resend-otp`, `GET /api/accounts/health`, `GET /api/catalog/**`. Các API còn lại cần header `Authorization: Bearer <token>` và đúng vai trò (xem `SecurityConfig`).

## Deploy giao diện (Firebase) + backend cho giảng viên test

- **Hosting FE:** `https://banvexe-web-app-41f61.web.app`
- **Hướng dẫn chi tiết:** [docs/DEPLOY_GV_TEST.md](docs/DEPLOY_GV_TEST.md) — Railway / Render, **`Dockerfile` gốc repo** (build JAR + copy `database/` cho seed), **`scripts/publish-firebase.ps1`** (build FE + Firebase khi đã có URL backend).

## Liên hệ

- **Giáo viên hướng dẫn:** ThS. Đặng Văn Thuận  
- **Sinh viên:** Nguyễn Thành Nhân, Trần Bảo Xuyên
