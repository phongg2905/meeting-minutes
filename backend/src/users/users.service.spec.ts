import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

const baseUser = {
  user_id: 2,
  role_id: 2,
  full_name: 'Nguyen Van A',
  email: 'user@school.edu.vn',
  password_hash: 'hashed',
  password_reset_code_hash: 'reset-hash',
  password_reset_expires_at: new Date('2026-06-02T10:00:00Z'),
  phone: '0900000000',
  status: 'active',
  created_at: new Date('2026-06-01T10:00:00Z'),
  role: { role_id: 2, role_name: 'Quáº£n lÃ½ biÃªn báº£n' },
};

function createService(overrides: any = {}) {
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue([baseUser]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockResolvedValue(baseUser),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findUnique: jest.fn().mockResolvedValue({ role_id: 2 }),
    },
    ...overrides,
  };
  const activityLogs = { log: jest.fn().mockResolvedValue({}) };
  return { service: new UsersService(prisma as any, activityLogs as any), prisma, activityLogs };
}

describe('UsersService', () => {
  it('sanitizes reset password fields from user responses', async () => {
    const { service } = createService();

    const result = await service.findOneSafe(2);

    expect(result).not.toHaveProperty('password_hash');
    expect(result).not.toHaveProperty('password_reset_code_hash');
    expect(result).not.toHaveProperty('password_reset_expires_at');
  });

  it('rejects invalid role ids during create', async () => {
    const { service, prisma } = createService({
      user: {
        findMany: jest.fn().mockResolvedValue([baseUser]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(baseUser),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });
    jest.spyOn(service, 'findByEmail').mockResolvedValue(null as any);

    await expect(service.create({
      role_id: 999,
      full_name: 'Test User',
      email: 'test@school.edu.vn',
      password: 'Password@123',
      status: 'active',
    }, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects invalid status updates at service layer', async () => {
    const { service, prisma } = createService();

    await expect(service.updateStatus(2, 'blocked', 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('sanitizes updateStatus response payload', async () => {
    const { service, prisma } = createService({
      user: {
        findMany: jest.fn().mockResolvedValue([baseUser]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(baseUser),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ ...baseUser, status: 'inactive' }),
        delete: jest.fn(),
      },
    });

    const result = await service.updateStatus(2, 'inactive', 1);

    expect(result).not.toHaveProperty('password_hash');
    expect(result).not.toHaveProperty('password_reset_code_hash');
    expect(result).not.toHaveProperty('password_reset_expires_at');
  });

  it('normalizes email before lookup and create', async () => {
    const { service, prisma } = createService({
      user: {
        findMany: jest.fn().mockResolvedValue([baseUser]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(baseUser),
        create: jest.fn().mockResolvedValue({ ...baseUser, email: 'upper@school.edu.vn' }),
        update: jest.fn(),
        delete: jest.fn(),
      },
    });
    jest.spyOn(service, 'findByEmail').mockResolvedValueOnce(null as any);

    await service.create({
      role_id: 2,
      full_name: 'Upper User',
      email: '  UPPER@School.edu.vn ',
      password: 'Password@123',
      status: 'active',
    }, 1);

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'upper@school.edu.vn',
      }),
    }));
  });

  it('normalizes email for findByEmail lookups', async () => {
    const { service, prisma } = createService();

    await service.findByEmail('  User@School.edu.vn ');

    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'user@school.edu.vn' },
    }));
  });
});
