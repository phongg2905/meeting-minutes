import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { normalizeEmail, sanitizeUser } from './user-response.util';
import { USER_STATUS_ACTIVE, USER_STATUSES } from './user.constants';
import { ROLE_ADMIN } from '../auth/roles.constants';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  async findAll(query: any = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const where: any = {};
    if (query.search) {
      where.OR = [
        { full_name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role_id) where.role_id = Number(query.role_id);
    if (query.status) where.status = query.status;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: users.map((user) => sanitizeUser(user)),
      total,
      page,
      limit,
    };
  }

  async findAllLegacy() {
    const users = await this.prisma.user.findMany({
      include: { role: true },
      orderBy: { created_at: 'desc' },
    });
    return users.map((user) => sanitizeUser(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: id },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async findOneSafe(id: number) {
    const user = await this.findOne(id);
    return sanitizeUser(user);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      include: { role: true },
    });
  }

  async create(dto: CreateUserDto, actorId: number) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email đã tồn tại');
    await this.assertValidRoleId(dto.role_id);
    this.assertValidStatus(dto.status);

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        role_id: dto.role_id,
        full_name: dto.full_name,
        email: normalizeEmail(dto.email),
        password_hash: hashed,
        phone: dto.phone,
        status: dto.status || USER_STATUS_ACTIVE,
      },
      include: { role: true },
    });
    const result = sanitizeUser(user);
    await this.activityLogs.log(actorId, 'CREATE', 'users', result.user_id, `Tạo người dùng: ${result.email}`);
    return result;
  }

  async update(id: number, dto: UpdateUserDto, actorId: number) {
    const existing = await this.findOne(id);
    if (dto.role_id !== undefined) await this.assertValidRoleId(dto.role_id);
    this.assertValidStatus(dto.status);

    // Chặn hạ quyền hoặc khóa Admin duy nhất
    const isDowngrade = dto.role_id !== undefined && dto.role_id !== existing.role_id;
    const isLocking = dto.status !== undefined && dto.status !== USER_STATUS_ACTIVE && existing.status === USER_STATUS_ACTIVE;
    if (existing.role_id === ROLE_ADMIN && (isDowngrade || isLocking)) {
      await this.assertNotLastAdmin(id);
    }

    const user = await this.prisma.user.update({
      where: { user_id: id },
      data: {
        full_name: dto.full_name,
        phone: dto.phone,
        role_id: dto.role_id,
        status: dto.status,
      },
      include: { role: true },
    });
    const result = sanitizeUser(user);
    await this.activityLogs.log(actorId, 'UPDATE', 'users', id, `Cập nhật người dùng: ${result.email}`);
    return result;
  }

  async updateProfile(id: number, dto: Pick<UpdateUserDto, 'full_name' | 'phone'>) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { user_id: id },
      data: {
        full_name: dto.full_name,
        phone: dto.phone,
      },
      include: { role: true },
    });
    const result = sanitizeUser(user);
    await this.activityLogs.log(id, 'UPDATE', 'users', id, `Cập nhật hồ sơ: ${result.email}`);
    return result;
  }

  async updatePassword(id: number, hashedPassword: string) {
    return this.prisma.user.update({
      where: { user_id: id },
      data: { password_hash: hashedPassword },
    });
  }

  async remove(id: number, actorId: number) {
    const user = await this.findOne(id);
    // Chặn xóa Admin duy nhất của hệ thống
    if (user.role_id === ROLE_ADMIN) {
      await this.assertNotLastAdmin(id);
    }
    const deleted = await this.prisma.user.delete({ where: { user_id: id } });
    await this.activityLogs.log(actorId, 'DELETE', 'users', id, `Xóa người dùng: ${user.email}`);
    return sanitizeUser(deleted);
  }

  async updateStatus(id: number, status: string, actorId: number) {
    this.assertValidStatus(status);
    const user = await this.findOne(id);
    // Chặn khóa Admin duy nhất
    if (user.role_id === ROLE_ADMIN && status !== USER_STATUS_ACTIVE && user.status === USER_STATUS_ACTIVE) {
      await this.assertNotLastAdmin(id);
    }
    const updated = await this.prisma.user.update({
      where: { user_id: id },
      data: { status },
    });
    await this.activityLogs.log(actorId, 'STATUS_CHANGE', 'users', id, `Thay đổi trạng thái người dùng ${user.email} -> ${status}`);
    return sanitizeUser(updated);
  }

  private async assertNotLastAdmin(excludeUserId: number) {
    const activeAdminCount = await this.prisma.user.count({
      where: {
        role_id: ROLE_ADMIN,
        status: USER_STATUS_ACTIVE,
        user_id: { not: excludeUserId },
      },
    });
    if (activeAdminCount === 0) {
      throw new BadRequestException(
        'Không thể thực hiện thao tác này vì đây là Admin hoạt động duy nhất của hệ thống',
      );
    }
  }

  private async assertValidRoleId(roleId: number) {
    const role = await this.prisma.role.findUnique({
      where: { role_id: roleId },
      select: { role_id: true },
    });
    if (!role) {
      throw new BadRequestException('Vai trò người dùng không hợp lệ');
    }
  }

  private assertValidStatus(status?: string) {
    if (status === undefined) return;
    if (!USER_STATUSES.includes(status as any)) {
      throw new BadRequestException('Trạng thái người dùng không hợp lệ');
    }
  }
}
