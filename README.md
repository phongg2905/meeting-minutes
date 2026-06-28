# Hệ Thống Quản Lý Biên Bản Họp Lớp

Hệ thống này dùng để tạo, lưu trữ, tra cứu, in, công khai và quản trị biên bản họp lớp. Dự án gồm backend NestJS, frontend React/Vite, cơ sở dữ liệu PostgreSQL và Prisma ORM.

## Tổng Quan

- Backend: NestJS 10, TypeScript, Prisma, JWT, Passport, bcrypt, Nodemailer.
- Frontend: React 18, TypeScript, Vite, Ant Design, TanStack Query, Zustand, Axios.
- Database: PostgreSQL.
- Lưu trữ tệp: Supabase Storage.
- Tài liệu API: Swagger.

## Chức Năng Chính

- Đăng ký, đăng nhập, đổi mật khẩu, quên mật khẩu bằng OTP email.
- Phân quyền 3 vai trò: Admin, Quản lý biên bản, Người dùng.
- Tạo, cập nhật, xoá, hoàn tất, công khai/ẩn biên bản.
- Hỗ trợ nhiều mẫu biên bản lớp với dữ liệu biểu mẫu riêng theo từng loại.
- Quản lý người tham dự, nhiệm vụ sau họp và tệp đính kèm.
- Tra cứu biên bản công khai không cần đăng nhập.
- Gửi ticket hỗ trợ và yêu cầu cấp quyền quản lý biên bản.
- Quản lý người dùng, nhật ký hoạt động, backup/restore và tình trạng hệ thống.

## Phân Quyền

| Role ID | Vai trò | Quyền chính |
| --- | --- | --- |
| 1 | Admin | Toàn quyền hệ thống, quản trị người dùng, backup, nhật ký, giám sát |
| 2 | Quản lý biên bản | Tạo và quản lý biên bản do mình phụ trách |
| 3 | Người dùng | Tra cứu biên bản công khai, gửi hỗ trợ, gửi yêu cầu cấp quyền |

Trạng thái biên bản hiện có:

- `draft`
- `completed`

Chỉ biên bản `completed` mới có thể bật `is_public`.

## Cấu Trúc Thư Mục

```text
meeting-minutes/
|-- README.md
|-- backend/
|   |-- package.json
|   |-- prisma/
|   |   |-- schema.prisma
|   |   |-- seed.ts
|   |   |-- migrations/
|   |   +-- manual-fixes/
|   |-- assets/
|   |   +-- fonts/
|   +-- src/
|       |-- app.module.ts
|       |-- main.ts
|       |-- activity-logs/
|       |-- auth/
|       |-- backup-logs/
|       |-- health/
|       |-- manager-role-requests/
|       |-- meeting-minutes/
|       |-- minute-attachments/
|       |-- minute-participants/
|       |-- minute-tasks/
|       |-- minute-types/
|       |-- notifications/
|       |-- support-tickets/
|       +-- users/
+-- frontend/
    |-- package.json
    |-- index.html
    |-- vite.config.ts
    +-- src/
        |-- App.tsx
        |-- main.tsx
        |-- components/
        |-- pages/
        |-- services/
        |-- store/
        |-- test/
        |-- types/
        +-- utils/
```

## Yêu Cầu Môi Trường

- Node.js 18 trở lên.
- npm.
- PostgreSQL.
- Supabase Storage nếu cần upload tệp, backup/restore và seed dữ liệu mẫu có đính kèm.

## Biến Môi Trường

Repository không kèm `.env.example`, nên bạn cần tạo file môi trường cho backend và frontend.

### Backend `backend/.env`

```env
DATABASE_URL="postgresql://username:password@localhost:5432/meeting_minutes"
DIRECT_URL="postgresql://username:password@localhost:5432/meeting_minutes"

JWT_SECRET="replace-with-a-long-random-secret"
PORT=3001
NODE_ENV="development"
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"
ENABLE_SWAGGER="true"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"

SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="meeting-attachments"

BACKUP_STORAGE_BUCKET="system-backups"
BACKUP_ENCRYPTION_KEY="replace-with-a-long-random-backup-key"
BACKUP_RETENTION_DAYS=14
```

Ghi chú:

- `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` là bắt buộc nếu dùng tệp đính kèm, backup/restore hoặc seed dữ liệu mẫu có file.
- Seed mặc định không cần Supabase vì tệp đính kèm đang tắt sẵn.
- `BACKUP_ENCRYPTION_KEY` là bắt buộc trong production khi tạo backup.
- Nếu chưa cấu hình SMTP, các tính năng quên mật khẩu/OTP sẽ không gửi email thực tế.

### Frontend `frontend/.env`

```env
VITE_API_URL=http://localhost:3001/api
```

## Cài Đặt Và Chạy Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Backend mặc định chạy tại:

```text
http://localhost:3001
```

Swagger mặc định:

```text
http://localhost:3001/api/docs
```

## Cài Đặt Và Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

## Dữ Liệu Seed

Seed hiện tại tạo dữ liệu mẫu quy mô lớn:

- 1 tài khoản Admin.
- 20 tài khoản Quản lý biên bản.
- 39 tài khoản Người dùng.
- 240 biên bản họp mẫu theo nhiều loại khác nhau.
- Người tham dự, nhiệm vụ, nội dung biên bản và dữ liệu biểu mẫu đầy đủ.

Bạn có thể tinh chỉnh số lượng bằng các biến môi trường trong `backend/.env` hoặc khi chạy seed:

```env
SEED_MANAGER_COUNT=20
SEED_USER_COUNT=39
SEED_MINUTE_COUNT=240
SEED_RANDOM_SEED="meeting-minutes-seed"
SEED_INCLUDE_ATTACHMENTS=false
```

Ghi chú:

- `SEED_INCLUDE_ATTACHMENTS=false` là mặc định để seed chạy được ngay cả khi chưa cấu hình Supabase.
- Nếu bật `SEED_INCLUDE_ATTACHMENTS=true`, cần có `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`.
- `SEED_MINUTE_COUNT` nên để trong khoảng 200-300 nếu bạn muốn mô phỏng tải dữ liệu lớn nhưng vẫn dễ kiểm soát.

Tài khoản mặc định sau khi seed:

| Email | Mật khẩu | Vai trò |
| --- | --- | --- |
| admin@school.edu.vn | Admin@123 | Admin |
| seed.manager.01@school.edu.vn | User@123 | Quản lý biên bản |
| seed.user.01@school.edu.vn | User@123 | Người dùng |

Nên đổi mật khẩu mặc định ngay sau khi triển khai.

## Script Quan Trọng

### Backend

```bash
npm run build
npm test
npm run start:dev
npm run start:prod
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm test
```

## Kiểm Tra Hiện Tại

Đã kiểm tra trực tiếp trong repository này vào ngày 2026-06-28:

- Backend `npm run build`: đạt.
- Backend `npm test`: đạt.
- Frontend `npm run build`: đạt.
- Frontend `npm test`: đạt.

Frontend build vẫn có cảnh báo chunk lớn từ Vite, nhưng không làm hỏng quá trình build.

## API Chính

### Xác thực

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/verify-registration-otp`
- `POST /api/auth/resend-registration-otp`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `PATCH /api/auth/change-password`

### Biên bản họp

- `GET /api/meeting-minutes`
- `GET /api/meeting-minutes/dashboard`
- `GET /api/meeting-minutes/:id`
- `POST /api/meeting-minutes`
- `PATCH /api/meeting-minutes/:id`
- `PATCH /api/meeting-minutes/:id/status`
- `PATCH /api/meeting-minutes/:id/public`
- `DELETE /api/meeting-minutes/:id`

### Biên bản công khai

- `GET /api/public/meeting-minutes`
- `GET /api/public/meeting-minutes/:id`

### Hỗ trợ và quản trị

- `GET /api/support-tickets`
- `POST /api/support-tickets`
- `PATCH /api/support-tickets/:id/request-info`
- `PATCH /api/support-tickets/:id/complete`
- `GET /api/support-tickets/attachments/:id/download`
- `GET /api/manager-role-requests`
- `GET /api/users`
- `GET /api/activity-logs`
- `GET /api/backup-logs`
- `GET /api/notifications`
- `GET /api/health`

## Lưu Ý Vận Hành

- Không commit file `.env`.
- Cần cấu hình đúng `CORS_ORIGINS` cho domain frontend thực tế.
- Backup và tệp đính kèm phụ thuộc Supabase Storage.
- Restore yêu cầu xác nhận chuỗi `RESTORE`.
- Tệp đính kèm hiện giới hạn 10 MB và có kiểm tra MIME type, phần mở rộng và chữ ký file cơ bản.
- Nên bật Swagger ở môi trường phù hợp.
