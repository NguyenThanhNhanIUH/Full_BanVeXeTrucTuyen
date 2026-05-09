# BanVeXe — Hệ thống bán vé xe trực tuyến

## Giới thiệu

**BanVeXe** là hệ thống bán vé xe trực tuyến gồm **backend REST (Spring Boot)** và **frontend SPA (React + Vite)**: quản lý tài khoản (đăng ký, OTP email, JWT), tra cứu tuyến/chuyến, đặt vé và thanh toán nội bộ, phân quyền khách hàng / nhân viên / quản trị.

### Thông tin dự án

- **Mô tả:** Quản lý bán vé xe trực tuyến (full‑stack: Spring Boot API + React SPA)
- **Phát triển:** Nguyễn Thành Nhân, Trần Bảo Xuyên
- **Hướng dẫn:** ThS. Đặng Văn Thuận
- **Đơn vị:** Trường Đại học Công nghiệp TP.HCM — Khoa CNTT

## Kiến trúc tổng quan

```
┌──────────────────────┐      HTTPS / JWT       ┌──────────────────────┐
│  frontend-reactjs    │ ─────────────────────► │  backend-springboot  │
│  React 19 + Vite     │                        │  Spring Boot 3.5     │
│  TailwindCSS, Axios  │ ◄───────────────────── │  REST + JWT + JPA    │
└──────────────────────┘     JSON responses     └──────────┬───────────┘
        ▲                                                  │
        │ Firebase Hosting                                 │ JDBC
        │                                                  ▼
   Người dùng cuối                                ┌──────────────────┐
                                                  │ MariaDB / MySQL  │
                                                  │  (QuanLyVeXe)    │
                                                  └──────────────────┘
```

Ba vai trò chính:

- **Khách hàng:** tra cứu catalog, đặt vé, thanh toán, hủy vé, hồ sơ cá nhân
- **Nhân viên:** danh sách vé, cập nhật vé, duyệt hủy, cập nhật trạng thái chuyến
- **Quản trị:** CRUD tuyến/chuyến/xe, quản lý nhân viên, xem khách hàng

## Cấu trúc thư mục

```
Full_BanVeXeTrucThuyen/
├── backend-springboot/               # API Spring Boot (Java 17, Maven)
│   ├── postman/                      # Collection Postman
│   ├── docs/API_TESTING.md           # Hướng dẫn test API (chi tiết)
│   ├── src/main/java/com/banvexe/accountmanagement/
│   │   ├── controller/               # REST: auth, catalog, booking, admin, staff, manager
│   │   ├── service/                  # Nghiệp vụ + booking/
│   │   ├── entity/                   # JPA (UserAccount, TuyenXe, ChuyenXe, VeXe, …)
│   │   ├── repository/
│   │   ├── dto/
│   │   ├── security/                 # JWT filter, SecurityConfig
│   │   └── config/                   # GlobalExceptionHandler
│   └── src/main/resources/application.yml
│
├── frontend-reactjs/                 # SPA React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── api/client.ts             # Axios client (gọi backend)
│   │   ├── auth/storage.ts           # Lưu JWT, user
│   │   ├── components/               # layout (Public/Admin), auth guards, common
│   │   ├── pages/
│   │   │   ├── public/               # Trang khách: Home, Schedule, Booking, Payment, Profile…
│   │   │   └── admin/                # Trang quản trị/nhân viên: Routes, Trips, Tickets, Vehicles…
│   │   └── utils/, types/
│   ├── firebase.json / .firebaserc   # Cấu hình Firebase Hosting
│   └── deploy-hosting.ps1            # Script build + deploy FE
│
├── database/                         # Script SQL khởi tạo (data.sql)
├── docs/DEPLOY_GV_TEST.md            # Hướng dẫn deploy cho giảng viên test
├── scripts/publish-firebase.ps1      # Build FE + đẩy lên Firebase Hosting
├── Dockerfile                        # Build JAR backend (Render/Railway)
├── render.yaml / railway.toml        # Cấu hình deploy backend
└── README.md
```

## Chức năng chính

- **Xác thực:** đăng ký, OTP xác thực email, đăng nhập JWT, xem hồ sơ (`/api/auth/me`), đổi mật khẩu / cập nhật hồ sơ
- **Catalog (công khai):** danh sách tuyến, chuyến, chi tiết chuyến, sơ đồ ghế
- **Khách:** đặt vé, thanh toán (thẻ, ví điện tử, chuyển khoản — enum nội bộ), xem/hủy vé, lịch sử mua vé, đổi mật khẩu
- **Nhân viên:** quản lý vé, duyệt hủy, cập nhật trạng thái chạy chuyến
- **Quản trị:** CRUD tuyến/chuyến/xe; quản lý tài khoản nhân viên & khách hàng

## Công nghệ

### Backend (`backend-springboot/`)

| Thành phần | Công nghệ |
|------------|-----------|
| Runtime | Java **17** |
| Framework | Spring Boot **3.5** (Web, Security, Data JPA, Validation, Mail) |
| Database | **MariaDB** / MySQL (driver `mariadb-java-client`); kèm **H2** trên classpath (thử nghiệm theo profile) |
| Bảo mật | JWT (**jjwt 0.12.6**), BCrypt, stateless session |
| Tiện ích | **Lombok**, **Cloudinary** (upload ảnh), **springboot3-dotenv** (đọc `.env`) |
| Build & test | Maven, Spring Boot Test |

### Frontend (`frontend-reactjs/`)

| Thành phần | Công nghệ |
|------------|-----------|
| Ngôn ngữ | **TypeScript** ~6 |
| UI runtime | **React 19** + **React DOM 19** |
| Build tool | **Vite 8** (`@vitejs/plugin-react`) |
| Routing | **react-router-dom 7** |
| HTTP client | **Axios** |
| Styling | **Tailwind CSS 4** (+ PostCSS, Autoprefixer) |
| Icon | **lucide-react** |
| Media | **Cloudinary** (SDK) |
| Lint | ESLint 9 + `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |
| Hosting | **Firebase Hosting** (`firebase.json`, `deploy-hosting.ps1`) |

### Hạ tầng & deploy

- **Docker** (`Dockerfile` ở gốc repo): build JAR backend + copy `database/` để seed.
- **Render / Railway** (`render.yaml`, `railway.toml`): deploy backend.
- **Firebase Hosting**: deploy frontend (script `scripts/publish-firebase.ps1`).

## Cài đặt & chạy

### Yêu cầu

- JDK **17+**, Maven **3.6+**
- Node.js **18+** (khuyến nghị 20+) và npm
- **MariaDB** hoặc MySQL tương thích

### 1. Clone repo

```bash
git clone <repository-url>
cd Full_BanVeXeTrucThuyen
```

### 2. Tạo database và dữ liệu mẫu

```bash
mysql -u root -p
```

Trong MySQL/MariaDB client:

```sql
SOURCE database/data.sql;
```

Script tạo database **`QuanLyVeXe`** (chú ý phân biệt hoa thường tùy hệ điều hành). Tên database trong `application.yml` phải trùng với DB bạn đã tạo.

### 3. Chạy backend (Spring Boot)

File cấu hình: `backend-springboot/src/main/resources/application.yml`

- **`spring.datasource`:** `url`, `username`, `password` trỏ tới MariaDB/MySQL của bạn.
- **`spring.jpa.hibernate.ddl-auto`:** hiện đặt **`validate`** — schema do script SQL quản lý; đổi sang `update` chỉ khi chủ động dùng Hibernate tạo/cập nhật bảng.
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

Khởi động backend:

```bash
cd backend-springboot
mvn spring-boot:run
```

Hoặc chạy class `com.banvexe.accountmanagement.AccountManagementApplication` trong IDE.

API mặc định: **http://localhost:8080**

### 4. Chạy frontend (React + Vite)

```bash
cd frontend-reactjs
npm install
npm run dev
```

Frontend mặc định: **http://localhost:5173** (xem `vite.config.ts` nếu đổi cổng).

> Cấu hình URL backend cho FE: tham khảo `frontend-reactjs/.env.production.example` để tạo `.env` / `.env.production` (ví dụ `VITE_API_BASE_URL=http://localhost:8080`). Axios client nằm ở `src/api/client.ts`.

Build production:

```bash
npm run build      # output: frontend-reactjs/dist
npm run preview    # xem thử bản build
```

## Kiểm thử API

- **Hướng dẫn chi tiết:** [backend-springboot/docs/API_TESTING.md](backend-springboot/docs/API_TESTING.md) — Postman, biến `baseUrl` / token, bảng endpoint, `curl`, lưu ý OTP và tài khoản seed.
- **Collection Postman:** import `backend-springboot/postman/BanVeXe-Account-Module.postman_collection.json`.

Tóm tắt: endpoint công khai gồm `/api/auth/register`, `/api/auth/login`, `/api/auth/verify-email`, `/api/auth/resend-otp`, `GET /api/accounts/health`, `GET /api/catalog/**`. Các API còn lại cần header `Authorization: Bearer <token>` và đúng vai trò (xem `SecurityConfig`).

## Deploy

- **Hosting FE (đang chạy):** https://banvexe-web-app-41f61.web.app
- **Hướng dẫn chi tiết:** [docs/DEPLOY_GV_TEST.md](docs/DEPLOY_GV_TEST.md) — Railway / Render, **`Dockerfile` gốc repo** (build JAR + copy `database/` cho seed), **`scripts/publish-firebase.ps1`** (build FE + Firebase khi đã có URL backend).

## Liên hệ

- **Giáo viên hướng dẫn:** ThS. Đặng Văn Thuận
- **Sinh viên:** Nguyễn Thành Nhân, Trần Bảo Xuyên
