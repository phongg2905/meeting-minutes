# Meeting Minutes Management System

Hệ thống quản lý biên bản họp lớp gồm backend NestJS, frontend React/Vite và cơ sở dữ liệu PostgreSQL thông qua Prisma. Hệ thống hỗ trợ tạo, lưu trữ, tra cứu, công khai, xuất PDF và quản lý biên bản họp lớp theo các mẫu biểu cố định.

## Tính Năng Chính

- Đăng ký, đăng nhập, đổi mật khẩu, quên mật khẩu bằng mã xác nhận email.
- Phân quyền Admin, Quản lý biên bản, Người dùng tra cứu và Người dùng thông thường.
- Tạo, sửa, xóa, hoàn tất, công khai hoặc ẩn biên bản họp lớp.
- Hỗ trợ 6 mẫu biên bản họp lớp với form nhập liệu riêng:
  - Mẫu biên bản họp lớp chi tiết nhất.
  - Mẫu biên bản họp lớp bầu ban cán sự.
  - Mẫu biên bản họp lớp bầu lớp trưởng.
  - Mẫu biên bản họp lớp tổng kết cuối kì.
  - Mẫu biên bản họp lớp kỷ luật học sinh.
  - Mẫu biên bản họp lớp đầu năm học.
- Form biên bản được tách thành các trường nhập cố định theo từng mẫu, không nhập tất cả nội dung trong một ô lớn.
- Hỗ trợ nhiều giáo viên tham dự; chủ tọa và thư ký giữ một người theo mẫu hiện tại.
- Hỗ trợ bảng động trong các mẫu cần thêm hàng như kết quả bầu ban cán sự.
- Xem trước biểu mẫu và xuất PDF từ trang chi tiết biên bản.
- Quản lý người tham dự, nhiệm vụ, file đính kèm, thông báo, hỗ trợ và yêu cầu trở thành quản lý biên bản.
- Trang tra cứu công khai cho biên bản đã hoàn tất và đã bật công khai.
- Admin quản lý người dùng, khóa/mở tài khoản, nhật ký hoạt động, backup/restore và trạng thái hệ thống.

## Phân Quyền

| Role ID | Vai trò | Quyền chính |
| --- | --- | --- |
| 1 | Admin | Toàn quyền quản trị hệ thống, người dùng, backup/restore, log, health và tất cả biên bản |
| 2 | Quản lý biên bản | Tạo và quản lý biên bản do mình tạo |
| 3 | Người dùng tra cứu | Tra cứu biên bản công khai |
| 4 | Người dùng | Tra cứu biên bản công khai, gửi hỗ trợ, xin quyền quản lý biên bản |

Biên bản dùng hai trạng thái chính: `draft` và `completed`. Chỉ biên bản `completed` mới được bật `is_public`.

## Công Nghệ

- Backend: NestJS 10, TypeScript, Prisma, JWT, Passport, Bcrypt, Nodemailer.
- Frontend: React 18, TypeScript, Vite, Ant Design, TanStack Query, Zustand, Axios.
- Database: PostgreSQL.
- API Docs: Swagger.

## Cấu Trúc Thư Mục

```text
meeting-minutes/
|-- README.md
|-- backend/
|   |-- package.json
|   |-- package-lock.json
|   |-- tsconfig.json
|   |-- prisma/
|   |   |-- schema.prisma
|   |   |-- seed.ts
|   |   |-- migrations/
|   |   +-- manual-fixes/
|   +-- src/
|       |-- main.ts
|       |-- app.module.ts
|       |-- prisma/
|       |-- auth/
|       |-- users/
|       |-- roles/
|       |-- minute-types/
|       |-- meeting-minutes/
|       |   |-- meeting-minutes.controller.ts
|       |   |-- public-meeting-minutes.controller.ts
|       |   |-- meeting-minutes.service.ts
|       |   |-- meeting-minutes.module.ts
|       |   |-- meeting-minutes.service.spec.ts
|       |   +-- dto/
|       |-- minute-participants/
|       |-- minute-tasks/
|       |-- minute-attachments/
|       |-- support-requests/
|       |-- manager-role-requests/
|       |-- activity-logs/
|       |-- backup-logs/
|       |-- notifications/
|       +-- health/
+-- frontend/
    |-- package.json
    |-- package-lock.json
    |-- vite.config.ts
    |-- tsconfig.json
    |-- tsconfig.node.json
    |-- index.html
    +-- src/
        |-- main.tsx
        |-- App.tsx
        |-- index.css
        |-- vite-env.d.ts
        |-- components/
        |   |-- layout/
        |   |   +-- MainLayout.tsx
        |   +-- meeting/
        |       |-- MeetingForm.tsx
        |       |-- StructuredMinuteFields.tsx
        |       +-- MinuteDocumentPreview.tsx
        |-- pages/
        |   |-- admin/
        |   |-- auth/
        |   |-- dashboard/
        |   |-- manager/
        |   |-- meetings/
        |   |-- public/
        |   |-- support/
        |   +-- ProfilePage.tsx
        |-- services/
        |   |-- api.ts
        |   +-- index.ts
        |-- store/
        |   +-- authStore.ts
        |-- types/
        |   +-- index.ts
        +-- utils/
            |-- exportPdf.ts
            |-- index.ts
            +-- minuteTemplates.ts
```

Các thư mục `node_modules/`, `dist/`, log runtime và file `.env` là file sinh ra khi chạy môi trường cục bộ, không cần đưa vào cấu trúc tài liệu.

## Yêu Cầu Môi Trường

- Node.js 18+.
- npm.
- PostgreSQL.

## Cài Đặt Backend

```bash
cd backend
npm install
cp .env.example .env
```

Cấu hình `backend/.env`:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"
ENABLE_SWAGGER="false"
BACKUP_ENCRYPTION_KEY="replace-with-a-long-random-backup-key"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"
```

Khởi tạo Prisma và dữ liệu mặc định:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Chạy backend development:

```bash
npm run start:dev
```

Backend mặc định chạy tại:

```text
http://localhost:3001
```

Swagger mở khi `NODE_ENV` khác `production` hoặc `ENABLE_SWAGGER=true`:

```text
http://localhost:3001/api/docs
```

## Cài Đặt Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Cấu hình `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

Chạy frontend development:

```bash
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

## Database Và Dữ Liệu Biên Bản

- Bảng `minute_types` lưu 6 loại biên bản.
- Bảng `meeting_minutes` lưu thông tin chung của biên bản.
- Cột `meeting_minutes.template_data` kiểu `JSONB` lưu dữ liệu form động của từng mẫu.
- Nội dung tổng hợp vẫn được lưu ở `discussion_content` để hỗ trợ tra cứu, xem nhanh và tương thích dữ liệu cũ.
- Người tham dự, nhiệm vụ và file đính kèm được lưu ở các bảng riêng.

Migration liên quan đến form động:

```text
backend/prisma/migrations/20260521143000_add_minute_template_data
```

Seed mặc định tạo đủ 6 loại biên bản và tài khoản admin.

## Tài Khoản Mặc Định

Sau khi chạy seed:

| Email | Mật khẩu | Vai trò |
| --- | --- | --- |
| admin@school.edu.vn | Admin@123 | Admin |

Nên đổi mật khẩu admin ngay sau khi triển khai.

## Scripts Quan Trọng

Backend:

```bash
npm run build
npm test
npm run start:prod
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
```

## Kiểm Tra Trước Khi Deploy

```bash
cd backend
npm run build
npm test

cd ../frontend
npm run build
```

Kết quả mong đợi:

- Backend build pass.
- Backend test pass.
- Frontend build pass.

## API Chính

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/forgot-password` | Gửi mã đặt lại mật khẩu |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu |
| GET | `/api/auth/me` | Lấy thông tin tài khoản hiện tại |
| PATCH | `/api/auth/change-password` | Đổi mật khẩu |
| GET | `/api/minute-types` | Danh sách loại biên bản |
| GET | `/api/meeting-minutes` | Danh sách biên bản |
| POST | `/api/meeting-minutes` | Tạo biên bản |
| GET | `/api/meeting-minutes/:id` | Chi tiết biên bản |
| PATCH | `/api/meeting-minutes/:id` | Cập nhật biên bản |
| PATCH | `/api/meeting-minutes/:id/status` | Chuyển `draft`/`completed` |
| PATCH | `/api/meeting-minutes/:id/public` | Bật/tắt công khai |
| DELETE | `/api/meeting-minutes/:id` | Xóa biên bản |
| GET | `/api/public/meeting-minutes` | Danh sách biên bản công khai |
| GET | `/api/public/meeting-minutes/:id` | Chi tiết biên bản công khai |
| GET | `/api/users` | Danh sách người dùng |
| GET | `/api/activity-logs` | Nhật ký hoạt động |
| GET | `/api/backup-logs` | Lịch sử backup/restore |
| GET | `/api/support-requests` | Yêu cầu hỗ trợ |
| GET | `/api/health` | Trạng thái hệ thống |

## Ghi Chú Bảo Mật Và Vận Hành

- Không commit file `.env`.
- Production phải đặt `NODE_ENV=production`.
- Production nên đặt `ENABLE_SWAGGER=false`.
- `JWT_SECRET` và `BACKUP_ENCRYPTION_KEY` phải là chuỗi dài, ngẫu nhiên, không dùng giá trị mẫu.
- `CORS_ORIGINS` phải trỏ đúng domain frontend thật.
- SMTP phải được cấu hình nếu dùng quên mật khẩu trong production.
- Tài khoản bị khóa sẽ không thể tiếp tục dùng JWT cũ.
- Backup production yêu cầu `BACKUP_ENCRYPTION_KEY` để mã hóa file backup.
- Restore yêu cầu xác nhận `RESTORE` và nên thử trước trên database test/staging.
- Upload file giới hạn 10 MB, có kiểm tra MIME type, phần mở rộng và chữ ký file cơ bản.

## Backup Và Restore

Admin có thể tạo backup trong giao diện quản trị. File backup nằm trong thư mục `backend/backups`.

Backup có thể chứa dữ liệu nhạy cảm như thông tin người dùng, hash mật khẩu và nội dung file đính kèm. Vì vậy:

- Luôn cấu hình `BACKUP_ENCRYPTION_KEY` ở production.
- Không chia sẻ file backup công khai.
- Không restore trực tiếp lên dữ liệu thật nếu chưa kiểm tra file backup trên môi trường test.
