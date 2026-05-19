# Hướng dẫn deploy (demo / GV test)

## Kiến trúc

| Thành phần | Công nghệ | Link |
|------------|-----------|------|
| Frontend | React + Vite, **Firebase Hosting** | https://banvexe-web-app-41f61.web.app |
| Backend API | Spring Boot (Docker), **Railway** | https://banvexe-backend-production-dc21.up.railway.app |
| Database | MySQL, **Railway** | Nội bộ project Railway (không mở link riêng) |

Trình duyệt chỉ mở link Firebase; API gọi ngầm tới backend Railway.

---

## Phần mềm / dịch vụ dùng

- [GitHub](https://github.com) — lưu mã nguồn, Railway deploy từ repo
- [Railway](https://railway.app) — MySQL + backend Docker
- [Firebase](https://firebase.google.com) — hosting frontend
- [HeidiSQL](https://www.heidisql.com/) — import file backup SQL vào MySQL Railway (tùy chọn)
- Node.js + npm — build frontend
- Firebase CLI — `firebase login`, deploy hosting

Biến môi trường backend: copy từ `backend-springboot/.env` (không commit file này).

---

## Deploy Railway (backend + MySQL)

1. Đẩy repo lên GitHub.
2. Railway → **New Project** → **Deploy from GitHub** → chọn repo (root có `Dockerfile`, `railway.toml`).
3. **+ Add → Database → MySQL** → đợi **Online**.
4. **+ Add** service backend (cùng repo) → **Root Directory** để trống.
5. Service **backend** → **Variables**: copy từ `.env`; chỉnh:
   - `SPRING_DATASOURCE_URL` → `jdbc:mariadb://mysql.railway.internal:3306/railway?useUnicode=true&characterEncoding=utf8mb4&useSSL=false&allowPublicKeyRetrieval=true`
   - `SPRING_DATASOURCE_PASSWORD` → reference `MYSQLPASSWORD` từ service MySQL
   - `APP_CORS_ALLOWED_ORIGINS` → `https://banvexe-web-app-41f61.web.app,https://banvexe-web-app-41f61.firebaseapp.com`
   - `JAVA_TOOL_OPTIONS` → `-Xms128m -Xmx384m -XX:+UseSerialGC` (tránh OOM)
6. **Settings → Networking → Generate Domain** (backend).
7. Kiểm tra: `{URL-backend}/api/accounts/health` → **200**.
8. (Tuỳ chọn) HeidiSQL: kết nối qua `MYSQL_PUBLIC_URL` → import `BanVeXe.sql`.

---

## Deploy Firebase (frontend)

Trong thư mục `frontend-reactjs` (đã `npm install`, `firebase login`):

```powershell
.\deploy-hosting.ps1 -ApiBaseUrl "https://banvexe-backend-production-dc21.up.railway.app"
```

Không thêm `/api` ở cuối URL. Đổi URL nếu Railway domain khác.

---

## Link gửi GV / demo

- **Web:** https://banvexe-web-app-41f61.web.app  
- **API health:** https://banvexe-backend-production-dc21.up.railway.app/api/accounts/health  

Tài khoản mẫu (mật khẩu thường `123456` — xem `database/data.sql`):

| Vai trò | Email |
|---------|--------|
| Quản trị | admin.baoxuyen@gmail.com |
| Nhân viên | nhanvien.baoxuyen@gmail.com |
| Khách hàng | khachhang.a@gmail.com |

---

## Lưu ý ngắn

- Đổi URL backend → chạy lại `deploy-hosting.ps1` với URL mới.
- Log deploy có `Killed` → thiếu RAM; giữ `JAVA_TOOL_OPTIONS` như trên.
- Tắt service Railway khi không demo để tiết kiệm credit.
