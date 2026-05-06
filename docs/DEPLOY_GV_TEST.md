# Deploy để thầy test (Firebase + backend)

## Thầy không có code — chỉ cần một link thì phải làm sao?

Thầy chỉ mở trình duyệt, không clone repo, không cài MariaDB. Vì vậy **mọi thứ phải chạy trên mạng**, gói gọn như sau:

| Thành phần | Thầy thấy gì? | Nó ở đâu? |
|------------|----------------|-----------|
| **Giao diện** | Trang web (bấm đăng nhập, đặt vé, …) | **Firebase Hosting** — bạn gửi **một link** (ví dụ `…web.app`). |
| **Backend (API)** | Thầy *không* thấy URL, nhưng trình duyệt gọi ngầm | Máy chủ cloud **của bạn** (Render, Railway, …) — bạn deploy JAR/Docker. |
| **Dữ liệu** | Thầy *không* cài DB | **Database trên cloud** (MariaDB/MySQL host) — bạn tạo một lần, nạp `data.sql` hoặc để app **tự seed** lần chạy đầu. |

**Kết luận:** Link cho thầy = link Firebase; **phía sau** link đó bắt buộc có **API public + DB public đã có bảng/dữ liệu**. Bạn làm việc deploy **một lần**; thầy chỉ cần link + (tuỳ bạn) bảng **email/mật khẩu** tài khoản mẫu để đăng nhập ba vai trò.

**Không làm được “chỉ Firebase”:** Firebase chỉ lưu file tĩnh, không chạy Spring Boot và không thay thế MariaDB.

---

**Frontend (đã có):** [https://banvexe-web-app-41f61.web.app](https://banvexe-web-app-41f61.web.app)

**Vấn đề:** Trang Firebase chỉ là file tĩnh; mọi API gọi tới backend qua biến `VITE_API_BASE_URL`. Bạn **bắt buộc** có URL backend HTTPS công khai và cấu hình CORS.

---

## Bước 1 — Có URL backend thật (chọn một cách)

### Cách C — Railway: MySQL + backend (khuyến nghị, gọn)

1. Đẩy project lên GitHub (private được).
2. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub repo** → chọn repo chứa `Full_BanVeXeTrucThuyen`.
3. **Service 1 — MySQL:** trong project → **+ New** → **Database** → **MySQL** (hoặc **Add MySQL**). Đợi provision xong → mở tab **Variables** / **Connect**: lấy `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` (tên biến có thể là `MYSQL_URL` — đọc kỹ màn Railway).
4. **Service 2 — Backend:**
   - **New** → **GitHub Repo** (cùng repo).
   - **Settings** → **Root Directory** để **trống** (gốc repo — nơi có `Dockerfile` và thư mục `database/`). Railway đọc `railway.toml` ở gốc repo.
5. Trên service **backend**, tab **Variables** → thêm (tự điền giá trị thật):
   - `SPRING_DATASOURCE_URL` =  
     `jdbc:mariadb://MYSQLHOST:MYSQLPORT/MYSQLDATABASE?useUnicode=true&characterEncoding=utf8mb4&connectionCollation=utf8mb4_unicode_ci&useSSL=true&allowPublicKeyRetrieval=true`  
     (thay bằng host/port/db thật từ MySQL service).
   - `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` = user/pass MySQL.
   - `SPRING_JPA_HIBERNATE_DDL_AUTO` = `none`
   - `APP_JWT_SECRET` = chuỗi bí mật dài (≥ 32 ký tự).
   - `APP_CORS_ALLOWED_ORIGINS` =  
     `https://banvexe-web-app-41f61.web.app,https://banvexe-web-app-41f61.firebaseapp.com`
   - Tuỳ chọn: copy `SPRING_MAIL_*`, `CLOUDINARY_*` từ `.env` máy bạn; `APP_PAYOS_DEV_MOCK=true` nếu không cấu hình PayOS production.
6. **Generate Domain** (Settings → Networking) cho service backend → được URL dạng `https://xxx.up.railway.app`.
7. Mở `{URL}/api/accounts/health` — 200 là OK. **Dockerfile gốc repo** đã nhúng `database/data.sql` vào image (`/database/data.sql`) và `APP_DB_SEED_SCRIPT`; **ConditionalSqlSeeder** sẽ tự nạp dữ liệu lần đầu. Nếu vẫn lỗi, import thủ công `database/data.sql` bằng HeidiSQL (host public Railway).

8. Khi đã có URL backend HTTPS, chuyển **Bước 2** (build FE + Firebase).

---

### Cách A — Nhanh, demo vài ngày: tunnel máy bạn (ngrok)

1. Chạy backend local: `mvn spring-boot:run` (port 8080), MariaDB đã có dữ liệu.
2. Cài [ngrok](https://ngrok.com/), đăng ký free, chạy: `ngrok http 8080`.
3. Copy URL dạng `https://xxxx.ngrok-free.app` — đây là **API base** (không thêm `/api`).

**Lưu ý:** Máy bạn phải mở; URL free đổi mỗi lần chạy ngrok (trừ gói trả phí).

### Cách B — Ổn cho báo cáo: Render (Docker)

1. Đẩy code lên GitHub (private cũng được).
2. Vào [Render](https://render.com/) → **New** → **Blueprint** → chọn repo → Render đọc `render.yaml` ở thư mục gốc project.
3. Tạo database **MariaDB/MySQL** có thể truy cập từ internet (ví dụ dịch vụ cloud của nhà cung cấp bạn chọn — Render không có MariaDB free sẵn trong blueprint này).
4. Trong service **banvexe-backend** trên Render, mở **Environment** và điền (tối thiểu):
   - `SPRING_DATASOURCE_URL` — JDBC tới DB cloud (có `?useUnicode=true&characterEncoding=utf8mb4` nếu cần).
   - `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
   - `APP_JWT_SECRET` — chuỗi dài ngẫu nhiên (≥ 32 ký tự).
   - `APP_CORS_ALLOWED_ORIGINS` — giữ như blueprint hoặc sửa nếu đổi domain Firebase.
   - Gmail / Cloudinary / PayOS — copy từ `.env` local nếu tính năng đó phải chạy trên mạng.
5. **Deploy** và chờ có URL dạng `https://banvexe-backend-xxxx.onrender.com`.

**Health check:** mở trình duyệt `{URL}/api/accounts/health` — trả 200 là backend sống.

**Lần đầu DB trống:** cho app chạy để `ConditionalSqlSeeder` nạp `database/data.sql` (hoặc import SQL thủ công vào DB cloud).

---

## Bước 2 — Build & deploy lại Firebase (trỏ tới backend)

Từ thư mục gốc `Full_BanVeXeTrucThuyen` (một lệnh):

```powershell
.\scripts\publish-firebase.ps1 -ApiBaseUrl "https://YOUR-BACKEND-HOST.com"
```

Hoặc trong `frontend-reactjs`:

```powershell
cd "Full_BanVeXeTrucThuyen\frontend-reactjs"
.\deploy-hosting.ps1 -ApiBaseUrl "https://YOUR-BACKEND-HOST.com"
```

Hoặc:

```powershell
cd "Full_BanVeXeTrucThuyen\frontend-reactjs"
npm run deploy:firebase -- -ApiBaseUrl "https://YOUR-BACKEND-HOST.com"
```

Thay `YOUR-BACKEND-HOST.com` bằng URL ngrok hoặc Render **(không có `/api` ở cuối)**.

Yêu cầu: đã `npm install`, đã `firebase login`, file `.firebaserc` đúng project Firebase.

---

## Bước 3 — CORS trên backend

Backend phải cho phép origin của Firebase:

```text
https://banvexe-web-app-41f61.web.app
https://banvexe-web-app-41f61.firebaseapp.com
```

Blueprint `render.yaml` đã gán biến `APP_CORS_ALLOWED_ORIGINS` với hai dòng trên. Nếu deploy chỗ khác, set tương tự trong env (phân tách dấu phẩy, không có khoảng thừa).

---

## Gửi thầy

- **Link app:** [https://banvexe-web-app-41f61.web.app](https://banvexe-web-app-41f61.web.app)
- **Một URL** cho cả ba vai trò; đăng nhập bằng tài khoản seed trong `database/data.sql` (mật khẩu seed thường là `123456` — xem file SQL / `PasswordService`).

| Vai trò     | Email (mẫu)                 |
|------------|-----------------------------|
| Quản trị   | `admin.baoxuyen@gmail.com`  |
| Nhân viên  | `nhanvien.baoxuyen@gmail.com` |
| Khách hàng | `khachhang.a@gmail.com`     |

---

## Gửi lại Cursor / AI: cần gì để “bấm giúp” bước Firebase?

Mình **không** đăng nhập Railway/Render/Firebase thay bạn. Bạn làm **Bước 1** xong, rồi **trả lời đúng một dòng:**

- **URL backend HTTPS** (ví dụ `https://xxx.up.railway.app`) — **không** có `/api` ở cuối.

Khi đó có thể chạy giúp (trên máy bạn):  
`.\scripts\publish-firebase.ps1 -ApiBaseUrl "https://..."`  
(hoặc bạn tự chạy lệnh đó — cần `firebase login` trước).

**File tham chiếu biến môi trường cloud:** `backend-springboot/.env.cloud.example`
