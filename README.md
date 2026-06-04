# Hệ Thống Quản Lý Biên Bản Họp Lớp

Hệ thống quản lý biên bản họp lớp gồm backend NestJS, frontend React/Vite và cơ sở dữ liệu PostgreSQL thông qua Prisma. Ứng dụng hỗ trợ tạo, lưu trữ, tra cứu, công khai, in và quản trị biên bản theo nhiều mẫu biểu khác nhau.

## Tổng Quan

- Backend: NestJS 10, TypeScript, Prisma, JWT, Passport, bcrypt, Nodemailer.
- Frontend: React 18, TypeScript, Vite, Ant Design, TanStack Query, Zustand, Axios.
- Database: PostgreSQL.
- Lưu trữ tệp: Supabase Storage.
- Tài liệu API: Swagger.

## Chức Năng Chính

- Đăng ký, đăng nhập, đổi mật khẩu, quên mật khẩu qua mã xác nhận email.
- Phân quyền quản trị viên, quản lý biên bản và người dùng thông thường.
- Tạo, cập nhật, xóa, hoàn tất và công khai biên bản họp.
- Quản lý 6 mẫu biên bản lớp với dữ liệu biểu mẫu riêng theo từng loại.
- Quản lý người tham dự, nhiệm vụ sau họp và tệp đính kèm.
- Tra cứu biên bản công khai ở khu vực không cần đăng nhập.
- Gửi yêu cầu hỗ trợ và yêu cầu cấp quyền quản lý biên bản.
- Quản trị người dùng, nhật ký hoạt động, sao lưu/khôi phục và tình trạng hệ thống.

## Phân Quyền Hiện Có

Theo seed và logic hiện tại, hệ thống đang dùng 3 vai trò:

| Role ID | Vai trò | Quyền chính |
| --- | --- | --- |
| 1 | Admin | Toàn quyền hệ thống, quản trị người dùng, sao lưu, nhật ký, trạng thái hệ thống |
| 2 | Quản lý biên bản | Tạo và quản lý biên bản mình được phép thao tác |
| 3 | Người dùng | Tra cứu biên bản công khai, gửi hỗ trợ, gửi yêu cầu cấp quyền |

Biên bản sử dụng 2 trạng thái chính:

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
|       |-- prisma/
|       |-- roles/
|       |-- support-requests/
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
- Supabase Storage nếu cần chạy upload tệp, backup/restore và seed dữ liệu mẫu có tệp đính kèm.

## Biến Môi Trường

Repository hiện không có file `.env.example`. Cần tự tạo file môi trường cho backend và frontend.

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

- `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` là bắt buộc nếu dùng tệp đính kèm, backup/restore hoặc chạy seed mẫu mặc định.
- `BACKUP_ENCRYPTION_KEY` là bắt buộc trong production khi tạo backup.
- Nếu chưa cấu hình SMTP, chức năng quên mật khẩu sẽ không gửi email thực tế.

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

Swagger mặc định có tại:

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

Seed hiện tại tạo:

- 3 vai trò: Admin, Quản lý biên bản, Người dùng.
- 6 loại biên bản.
- 3 tài khoản mẫu.
- Một số biên bản, nhiệm vụ, người tham dự, yêu cầu hỗ trợ, yêu cầu cấp quyền và tệp đính kèm mẫu.

Tài khoản mặc định sau khi seed:

| Email | Mật khẩu | Vai trò |
| --- | --- | --- |
| admin@school.edu.vn | Admin@123 | Admin |
| manager@school.edu.vn | User@123 | Quản lý biên bản |
| student@school.edu.vn | User@123 | Người dùng |

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

## Kết Quả Kiểm Tra Hiện Tại

Đã kiểm tra trực tiếp trong repository này vào ngày 04/06/2026:

- Backend `npm test`: đạt.
- Backend `npm run build`: đạt.
- Frontend `npm test`: đạt.
- Frontend `npm run build`: đạt.

Frontend khi test/build có cảnh báo từ Vite về cấu hình `esbuild` đã cũ của plugin React, nhưng quá trình kiểm thử và build vẫn hoàn tất thành công.

## API Chính

### Xác thực

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `PATCH /api/auth/change-password`

### Biên bản họp

- `GET /api/meeting-minutes`
- `GET /api/meeting-minutes/:id`
- `POST /api/meeting-minutes`
- `PATCH /api/meeting-minutes/:id`
- `PATCH /api/meeting-minutes/:id/status`
- `PATCH /api/meeting-minutes/:id/public`
- `DELETE /api/meeting-minutes/:id`

### Biên bản công khai

- `GET /api/public/meeting-minutes`
- `GET /api/public/meeting-minutes/:id`

### Quản trị và chức năng phụ trợ

- `GET /api/users`
- `GET /api/activity-logs`
- `GET /api/backup-logs`
- `GET /api/support-requests`
- `GET /api/health`

## Lưu Ý Vận Hành

- Không commit file `.env`.
- Cần cấu hình đúng `CORS_ORIGINS` cho domain frontend thực tế.
- Backup và tệp đính kèm phụ thuộc Supabase Storage.
- Restore yêu cầu xác nhận chuỗi `RESTORE`.
- Tệp đính kèm hiện giới hạn 10 MB và có kiểm tra MIME type, phần mở rộng và chữ ký tệp cơ bản.
- Chỉ nên bật Swagger ở môi trường phù hợp.
