# 📋 Phần Mềm Quản Lý Biên Bản Họp Lớp

Hệ thống quản lý biên bản họp lớp đầy đủ, bao gồm Backend (NestJS), Frontend (React), Database (Supabase/PostgreSQL), ORM (Prisma), và Auth (JWT).

---

## 🗂️ Cấu trúc dự án

```
meeting-minutes/
├── backend/          ← NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma   ← Định nghĩa database schema
│   │   └── seed.ts         ← Dữ liệu mẫu ban đầu
│   └── src/
│       ├── auth/           ← Xác thực JWT
│       ├── users/          ← Quản lý người dùng
│       ├── roles/          ← Vai trò
│       ├── meeting-minutes/← Biên bản họp (CRUD chính)
│       ├── minute-types/   ← Loại biên bản
│       ├── minute-tasks/   ← Nhiệm vụ
│       ├── minute-participants/ ← Người tham dự
│       ├── minute-attachments/  ← File đính kèm
│       ├── activity-logs/  ← Nhật ký hoạt động
│       └── backup-logs/    ← Nhật ký backup
└── frontend/         ← React + TypeScript
    └── src/
        ├── pages/          ← Các trang giao diện
        ├── components/     ← Components tái sử dụng
        ├── services/       ← Gọi API
        ├── store/          ← Zustand state management
        ├── types/          ← TypeScript interfaces
        └── utils/          ← Hàm tiện ích
```

---

## ⚙️ Cài đặt

### Bước 1: Tạo project Supabase

1. Truy cập [https://supabase.com](https://supabase.com) → Tạo project mới
2. Vào **Settings → Database → Connection string** → Copy connection string (URI mode)
3. Thay `[YOUR-PASSWORD]` bằng mật khẩu bạn đặt khi tạo project

### Bước 2: Cài đặt Backend

```bash
cd backend

# Cài dependencies
npm install

# Tạo file .env từ mẫu
cp .env.example .env
```

Chỉnh sửa file `.env`:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
JWT_SECRET="thay-bang-chuoi-bi-mat-cua-ban-dai-hon-32-ky-tu"
JWT_EXPIRES_IN="7d"
PORT=3001
```

```bash
# Generate Prisma client
npx prisma generate

# Migrate database (tạo bảng)
npx prisma migrate dev --name init

# Seed dữ liệu mẫu
npx prisma db seed

# Chạy server
npm run start:dev
```

✅ Backend chạy tại: `http://localhost:3001`  
📚 Swagger API docs: `http://localhost:3001/api/docs`

### Bước 3: Cài đặt Frontend

```bash
cd ../frontend

# Cài dependencies
npm install

# Tạo file .env
cp .env.example .env
# File .env mặc định: VITE_API_URL=http://localhost:3001/api

# Chạy development server
npm run dev
```

✅ Frontend chạy tại: `http://localhost:5173`

---

## 🔐 Tài khoản mặc định

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| admin@school.edu.vn | Admin@123 | Quản trị viên |

---

## 🚀 Tính năng

### Người dùng thường
- ✅ Đăng nhập / đăng xuất
- ✅ Tạo, xem, sửa, xóa biên bản họp của mình
- ✅ Thêm người tham dự, nhiệm vụ vào biên bản
- ✅ Tìm kiếm và lọc biên bản
- ✅ Xem chi tiết biên bản (thông tin, người tham dự, nhiệm vụ, tệp đính kèm)
- ✅ Cập nhật thông tin cá nhân, đổi mật khẩu

### Quản trị viên (Admin)
- ✅ Tất cả quyền của người dùng thường
- ✅ Xem và quản lý TẤT CẢ biên bản
- ✅ Duyệt / từ chối biên bản
- ✅ Quản lý người dùng (tạo, sửa, xóa, khóa/mở tài khoản)
- ✅ Xem nhật ký hoạt động hệ thống
- ✅ Xem tổng quan thống kê trên dashboard

---

## 🛠️ Tech Stack

| Tầng | Công nghệ |
|------|-----------|
| Frontend | React 18 + TypeScript + Ant Design 5 |
| State | Zustand + TanStack Query |
| Router | React Router v6 |
| Backend | NestJS 10 + TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + Bcrypt |
| API Docs | Swagger (OpenAPI) |

---

## 📡 API Endpoints chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/auth/login | Đăng nhập |
| GET | /api/auth/me | Lấy thông tin người dùng hiện tại |
| PATCH | /api/auth/change-password | Đổi mật khẩu |
| GET | /api/meeting-minutes | Danh sách biên bản (có phân trang, tìm kiếm) |
| POST | /api/meeting-minutes | Tạo biên bản mới |
| GET | /api/meeting-minutes/:id | Chi tiết biên bản |
| PATCH | /api/meeting-minutes/:id | Cập nhật biên bản |
| PATCH | /api/meeting-minutes/:id/status | Cập nhật trạng thái |
| DELETE | /api/meeting-minutes/:id | Xóa biên bản |
| GET | /api/users | Danh sách người dùng (Admin) |
| POST | /api/users | Tạo người dùng (Admin) |
| GET | /api/activity-logs | Nhật ký hoạt động (Admin) |
