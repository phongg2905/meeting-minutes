import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const roles = [
  { role_id: 1, role_name: 'Admin' },
  { role_id: 2, role_name: 'Quản lý biên bản' },
  { role_id: 3, role_name: 'Người dùng tra cứu' },
  { role_id: 4, role_name: 'Người dùng' },
];

const minuteTypes = [
  { type_id: 1, type_name: 'Mẫu biên bản họp lớp chi tiết nhất' },
  { type_id: 2, type_name: 'Mẫu biên bản họp lớp bầu ban cán sự' },
  { type_id: 3, type_name: 'Mẫu biên bản họp lớp bầu lớp trưởng' },
  { type_id: 4, type_name: 'Mẫu biên bản họp lớp tổng kết cuối kì' },
  { type_id: 5, type_name: 'Mẫu biên bản họp lớp kỷ luật học sinh' },
  { type_id: 6, type_name: 'Mẫu biên bản họp lớp đầu năm học' },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { role_id: role.role_id },
      update: { role_name: role.role_name },
      create: role,
    });
  }

  for (const type of minuteTypes) {
    await prisma.minuteType.upsert({
      where: { type_id: type.type_id },
      update: { type_name: type.type_name },
      create: type,
    });
  }

  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@school.edu.vn' },
    update: { role_id: 1, status: 'active' },
    create: {
      role_id: 1,
      full_name: 'Quản trị viên',
      email: 'admin@school.edu.vn',
      password_hash: hashedPassword,
      phone: '0900000000',
      status: 'active',
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
