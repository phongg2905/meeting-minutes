# Meeting Minutes Management System

Hệ thống quản lý biên bản họp lớp gồm backend NestJS, frontend React/Vite và database PostgreSQL thông qua Prisma. Mục tiêu chính là cho người có quyền quản lý đăng, lưu trữ, tìm kiếm, công khai và theo dõi biên bản.

## Tính năng chính

- Đăng ký, đăng nhập, đổi mật khẩu, quên mật khẩu bằng mã xác nhận email.
- Người dùng thường có thể tra cứu biên bản công khai, gửi yêu cầu hỗ trợ và gửi yêu cầu trở thành quản lý biên bản.
- Quản lý biên bản/Admin có thể tạo, sửa, xóa, hoàn tất, công khai hoặc ẩn biên bản.
- Quản lý người tham dự, nhiệm vụ và file đính kèm trong từng biên bản.
- Trang tra cứu công khai cho biên bản đã hoàn tất và đã bật công khai.
- Admin quản lý người dùng, khóa/mở tài khoản, xử lý hỗ trợ, xử lý yêu cầu trở thành quản lý biên bản.
- Admin xem nhật ký hoạt động, lịch sử backup/restore và trạng thái hệ thống.
- Các bảng quản trị lớn có phân trang, tìm kiếm và bộ lọc.
- Frontend dùng lazy loading theo route; tính năng xuất PDF chỉ tải thư viện khi người dùng bấm xuất.

## Phân quyền

| Role ID | Vai trò | Quyền chính |
| --- | --- | --- |
| 1 | Admin | Toàn quyền quản trị, quản lý user, backup/restore, log, health, tất cả biên bản |
| 2 | Quản lý biên bản | Tạo và quản lý biên bản do mình tạo |
| 3 | Người dùng tra cứu | Tra cứu biên bản công khai |
| 4 | Người dùng | Tra cứu biên bản công khai, gửi hỗ trợ, xin quyền quản lý |

Lưu ý: hệ thống hiện không dùng workflow duyệt biên bản. Biên bản được quản lý bằng trạng thái `draft` và `completed`, sau đó có thể bật/tắt `is_public`.

## Công nghệ

- Backend: NestJS 10, TypeScript, Prisma, JWT, Passport, Bcrypt, Nodemailer.
- Frontend: React 18, TypeScript, Vite, Ant Design, TanStack Query, Zustand, Axios.
- Database: PostgreSQL.
- API Docs: Swagger, chỉ nên bật trong development hoặc khi chủ động cấu hình.

## Cấu trúc thư mục

```text
meeting-minutes/
|-- README.md
|-- backend/
|   |-- package.json
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
|       |   |-- prisma.module.ts
|       |   +-- prisma.service.ts
|       |-- auth/
|       |   |-- auth.controller.ts
|       |   |-- auth.service.ts
|       |   |-- auth.module.ts
|       |   |-- jwt.strategy.ts
|       |   |-- jwt-auth.guard.ts
|       |   |-- roles.constants.ts
|       |   +-- dto/
|       |-- users/
|       |   |-- users.controller.ts
|       |   |-- users.service.ts
|       |   |-- users.module.ts
|       |   +-- dto/
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
        |       +-- MeetingForm.tsx
        |-- pages/
        |   |-- auth/
        |   |   +-- LoginPage.tsx
        |   |-- dashboard/
        |   |   +-- DashboardPage.tsx
        |   |-- meetings/
        |   |   |-- MeetingsListPage.tsx
        |   |   |-- MeetingCreatePage.tsx
        |   |   |-- MeetingEditPage.tsx
        |   |   +-- MeetingDetailPage.tsx
        |   |-- public/
        |   |   |-- PublicMeetingsListPage.tsx
        |   |   +-- PublicMeetingDetailPage.tsx
        |   |-- admin/
        |   |   |-- UsersPage.tsx
        |   |   |-- ActivityLogsPage.tsx
        |   |   |-- BackupLogsPage.tsx
        |   |   |-- ManagerRoleRequestsPage.tsx
        |   |   +-- SystemHealthPage.tsx
        |   |-- manager/
        |   |   +-- ManagerRoleRequestPage.tsx
        |   |-- support/
        |   |   +-- SupportRequestsPage.tsx
        |   +-- ProfilePage.tsx
        |-- services/
        |   |-- api.ts
        |   +-- index.ts
        |-- store/
        |   +-- authStore.ts
        |-- types/
        |   +-- index.ts
        +-- utils/
            |-- index.ts
            +-- exportPdf.ts
```

## Yêu cầu môi trường

- Node.js 18+.
- npm.
- PostgreSQL database.

## Cài đặt Backend

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

Khởi tạo Prisma và dữ liệu mẫu:

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

Swagger chỉ mở khi:

- `NODE_ENV` khác `production`, hoặc
- `ENABLE_SWAGGER=true`.

Đường dẫn Swagger:

```text
http://localhost:3001/api/docs
```

## Cài đặt Frontend

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

## Kiểm tra trước khi DEPLOY

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
- Vite không còn cảnh báo chunk lớn trên bundle chính.

## Lưu ý bảo mật và vận hành

- Không commit file `.env`.
- Production phải đặt `NODE_ENV=production`.
- Production nên đặt `ENABLE_SWAGGER=false`.
- `JWT_SECRET` và `BACKUP_ENCRYPTION_KEY` phải là chuỗi dài, ngẫu nhiên, không dùng giá trị mẫu.
- `CORS_ORIGINS` phải trỏ đúng domain frontend thật.
- SMTP phải được cấu hình nếu dùng quên mật khẩu trong production. Nếu thiếu SMTP ở production, API quên mật khẩu sẽ báo lỗi thay vì log mã reset ra console.
- Tài khoản bị khóa sẽ không thể tiếp tục dùng JWT cũ.
- Backup production yêu cầu `BACKUP_ENCRYPTION_KEY` để mã hóa file backup.
- Restore yêu cầu xác nhận `RESTORE` và chỉ nên thử lần đầu trên database test/staging.
- Upload file giới hạn 10 MB, kiểm tra MIME type, phần mở rộng và chữ ký file cơ bản.

## Backup Va Restore

Admin có thể tạo backup trong giao diện quản trị. File backup nằm trong thư mục `backend/backups`.

Backup có thể chứa dữ liệu nhạy cảm như thông tin người dùng, hash mật khẩu và nội dung file đính kèm. Vì vậy:

- Luôn cầu hình `BACKUP_ENCRYPTION_KEY` ở production.
- Không chia sẻ file backup công khai.
- Không restore trực tiếp lên dữ liệu thật nếu chưa kiểm tra file backup trên môi trường test.

## API Chính

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/forgot-password` | Gửi mã đặt lại mật khẩu |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu |
| GET | `/api/auth/me` | Lấy thông tin tài khoản hiện tại |
| PATCH | `/api/auth/change-password` | Đổi mật khẩu |
| GET | `/api/meeting-minutes` | Danh sách biên bản |
| POST | `/api/meeting-minutes` | Tạo biên bản |
| GET | `/api/meeting-minutes/:id` | Chi tiết biên bản |
| PATCH | `/api/meeting-minutes/:id` | Cập nhật biên bản |
| PATCH | `/api/meeting-minutes/:id/status` | Chuyển `draft`/`completed` |
| PATCH | `/api/meeting-minutes/:id/public` | Bật/tắt công khai |
| DELETE | `/api/meeting-minutes/:id` | Xóa biên bản |
| GET | `/api/public/meeting-minutes` | Danh sách biên bản công khai |
| GET | `/api/users` | Danh sách người dùng, có phân trang/lọc |
| GET | `/api/activity-logs` | Nhật ký hoạt động, có phân trang/lọc |
| GET | `/api/backup-logs` | Lịch sử backup/restore, có phân trang/lọc |
| GET | `/api/support-requests` | Yêu cầu hỗ trợ, có phân trang/lọc |
| GET | `/api/health` | Trạng thái hệ thống |

