# LHU MEDIA STUDIO — Hệ thống Quản lý Thiết bị, Đặt phòng Studio & Điều phối CTV

Hệ thống web quản lý toàn diện dành cho **Bộ phận Truyền thông — Trường Đại học Lạc Hồng (LHU Media Studio)**, hỗ trợ đầy đủ 3 vai trò (**Quản trị viên — ADMIN**, **Cộng tác viên — COLLABORATOR**, **Người dùng — USER**) từ quản lý thiết bị, mượn/trả, bảo trì, đặt phòng Studio, giao việc, lịch trực 3 giai đoạn, chấm công & tính thù lao đến thống kê, xuất Excel và lịch sử thao tác.

---

## 1. Công nghệ sử dụng

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS v4, FullCalendar v6, Lucide Icons |
| **Backend** | Node.js (v20+), Express.js, Sequelize ORM, JWT (`jsonwebtoken`), `bcryptjs`, `express-validator` |
| **Cơ sở dữ liệu** | Microsoft SQL Server (MSSQL / SQL Express) với Transaction & `sp_getapplock` chống race condition |
| **Lưu trữ Media** | Cloudinary (ảnh thiết bị, avatar, thư viện ảnh, video nền, hóa đơn bảo trì) + fallback local `/uploads` |
| **Email & Thông báo** | Nodemailer + Gmail SMTP (OTP xác thực & email giao dịch) + Thông báo in-app (`Notifications`) |
| **Báo cáo & API Docs** | ExcelJS (9 endpoint xuất `.xlsx` có công thức thực), Swagger UI / OpenAPI 3.0.0 (`/api-docs`) |

---

## 2. Cấu trúc thư mục dự án

```text
CODE/
├── TN-Backend/                   # REST API Server (Express + Sequelize + MSSQL, cổng 5000)
│   ├── src/
│   │   ├── config/               # database.js, mailer.js, cloudinary.js, swagger.js
│   │   ├── controllers/          # Xử lý HTTP Request/Response
│   │   ├── middlewares/          # auth.middleware.js (JWT + RBAC), auditLog.middleware.js, validate
│   │   ├── models/               # 15 Sequelize Models (Users, Equipments, Tasks, StudioShifts, ...)
│   │   ├── routes/               # 18 route modules (OpenAPI 3.0.0 — 92 paths)
│   │   ├── services/             # Business logic, Payroll 7 quy tắc, Transaction + sp_getapplock
│   │   └── server.js             # Entry point + Background worker tự động hoàn thành ca trực
│   ├── scripts/                  # Bộ kịch bản kiểm thử tích hợp & Giai đoạn 5
│   ├── test/unit.test.js         # 144 Unit Tests (26 Test Suites)
│   └── seed.js                   # Khởi tạo dữ liệu mẫu
├── TN-Frontend/                  # Web Application (Next.js 16, cổng 3000)
│   └── src/
│       ├── app/                  # 28 tuyến trang (Trang chủ, Thiết bị, Studio, CTV, Quản trị)
│       ├── components/           # Navbar, AdminLayout, WeeklyDutyScheduleTable, DatePickerVN, ...
│       ├── context/              # AuthContext, ThemeContext (Light/Dark), ToastContext
│       └── lib/api.ts            # API Client tập trung (hỗ trợ JWT + tải file nhị phân .xlsx)
├── KE_HOACH_TRIEN_KHAI.md        # Kế hoạch triển khai 5 giai đoạn & 27 tiêu chí TC-01..TC-27
├── BIEN_BAN_BAN_GIAO_NGHIEM_THU.md # Biên bản bàn giao & nghiệm thu dự án
├── CHUC_NANG.md                  # Đặc tả chức năng hệ thống (FR-01 -> FR-09)
├── KIEN_TRUC.md                  # Tài liệu kiến trúc hệ thống
├── QUY_TAC.md                    # Bộ quy tắc nghiệp vụ & công thức tính thù lao
└── README.md                     # Tài liệu hướng dẫn cài đặt & vận hành này
```

---

## 3. Yêu cầu môi trường

- **Node.js** `>= 20.x` và **npm** `>= 10.x`
- **Microsoft SQL Server** (SQL Server 2019/2022 hoặc SQL Server Express) đã bật **TCP/IP cổng 1433** và **SQL Server Authentication**
- Tài khoản **Cloudinary** (upload ảnh/video) và **Gmail App Password** (gửi email OTP & thông báo)

---

## 4. Hướng dẫn cài đặt & cấu hình

### Bước 1: Tạo cơ sở dữ liệu SQL Server
Mở SSMS (SQL Server Management Studio) và tạo database trống (hoặc import file `data.sql` nếu cần dữ liệu mẫu):
```sql
CREATE DATABASE TN_Database;
```

### Bước 2: Cấu hình Backend (`TN-Backend/.env`)
Tạo file `TN-Backend/.env` với các biến môi trường sau:
```env
PORT=5000
NODE_ENV=development

# SQL Server
DB_HOST=localhost
DB_PORT=1433
DB_NAME=TN_Database
DB_USER=sa
DB_PASSWORD=<mat_khau_sql_server>
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# JWT
JWT_SECRET=<chuoi_bi_mat_jwt_manh>
JWT_EXPIRES_IN=7d

# Cloudinary (tùy chọn, có fallback lưu local)
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>

# SMTP Mailer (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email_gui_thong_bao>
SMTP_PASS=<gmail_app_password>
SMTP_FROM="LHU Media Studio <email_gui_thong_bao>"

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Bước 3: Cài đặt thư viện
```bash
# Cài đặt Backend
cd TN-Backend
npm install

# Cài đặt Frontend
cd ../TN-Frontend
npm install
```

### Bước 4: Khởi chạy hệ thống

#### Chế độ Development (phát triển)
```bash
# Terminal 1 — Backend (http://localhost:5000)
npm --prefix TN-Backend run dev

# Terminal 2 — Frontend (http://localhost:3000)
npm --prefix TN-Frontend run dev
```

#### Chế độ Production (bàn giao / triển khai)
```bash
# 1. Build Frontend
npm --prefix TN-Frontend run build

# 2. Chạy Backend (tự động đồng bộ schema CSDL khi khởi động)
npm --prefix TN-Backend start

# 3. Chạy Frontend Production Server
npm --prefix TN-Frontend run start
```

---

## 5. Đường dẫn truy cập chính

| Dịch vụ | URL | Mô tả |
| :--- | :--- | :--- |
| **Web Frontend** | `http://localhost:3000` | Giao diện người dùng, CTV & Quản trị (hỗ trợ Light/Dark Mode) |
| **REST API Base** | `http://localhost:5000/api` | API Server (Frontend gọi qua Next.js `/api` proxy) |
| **Swagger API Docs** | `http://localhost:5000/api-docs` | Tài liệu OpenAPI 3.0.0 tương tác trực tiếp (92 paths) |
| **OpenAPI JSON** | `http://localhost:5000/api-docs.json` | File đặc tả JSON để import vào Postman |
| **Health Check** | `http://localhost:5000/health` | Kiểm tra trạng thái sống của Backend |

---

## 6. Kiểm thử tự động

```bash
# 1. Bộ Unit Test Backend (26 suites — 144 test cases, không cần DB)
npm --prefix TN-Backend test

# 2. Bộ kiểm thử tích hợp toàn diện Giai đoạn 5 (RBAC 4 vai trò + Hồi quy FR-01..FR-09 + Concurrency Locks + DB Integrity + Swagger + Frontend SSR)
# (Yêu cầu Backend :5000, Frontend :3000 và SQL Server đang chạy)
npm --prefix TN-Backend run test:phase5

# 3. Kiểm tra TypeScript Frontend (0 lỗi)
TN-Frontend\node_modules\.bin\tsc.cmd -p TN-Frontend\tsconfig.json --noEmit
```

---

## 7. Tài liệu kỹ thuật liên quan

- **Đặc tả chức năng (FR-01 → FR-09):** `CHUC_NANG.md`
- **Kiến trúc hệ thống:** `KIEN_TRUC.md`
- **Quy tắc nghiệp vụ & Công thức thù lao:** `QUY_TAC.md`
- **Kế hoạch triển khai & Kiểm chứng (TC-01 → TC-27):** `KE_HOACH_TRIEN_KHAI.md`
- **Biên bản bàn giao nghiệm thu:** `BIEN_BAN_BAN_GIAO_NGHIEM_THU.md`
