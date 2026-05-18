import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.role.upsert({
    where: { role_id: 1 },
    update: { role_name: 'Admin' },
    create: { role_id: 1, role_name: 'Admin' },
  });
  await prisma.role.upsert({
    where: { role_id: 2 },
    update: { role_name: 'Quản lý biên bản' },
    create: { role_id: 2, role_name: 'Quản lý biên bản' },
  });
  await prisma.role.upsert({
    where: { role_id: 3 },
    update: { role_name: 'Người dùng tra cứu' },
    create: { role_id: 3, role_name: 'Người dùng tra cứu' },
  });
  await prisma.role.upsert({
    where: { role_id: 4 },
    update: { role_name: 'Người dùng' },
    create: { role_id: 4, role_name: 'Người dùng' },
  });

  await prisma.minuteType.upsert({
    where: { type_id: 1 },
    update: { type_name: 'Họp lớp thường kỳ' },
    create: { type_id: 1, type_name: 'Họp lớp thường kỳ' },
  });
  await prisma.minuteType.upsert({
    where: { type_id: 2 },
    update: { type_name: 'Họp bất thường' },
    create: { type_id: 2, type_name: 'Họp bất thường' },
  });
  await prisma.minuteType.upsert({
    where: { type_id: 3 },
    update: { type_name: 'Họp tổng kết' },
    create: { type_id: 3, type_name: 'Họp tổng kết' },
  });
  await prisma.minuteType.upsert({
    where: { type_id: 4 },
    update: { type_name: 'Họp đầu năm học' },
    create: { type_id: 4, type_name: 'Họp đầu năm học' },
  });

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
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
