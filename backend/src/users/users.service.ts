import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { role: true },
      orderBy: { created_at: 'desc' },
    });
    return users.map(({ password_hash, ...user }) => user);
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
    const { password_hash, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async create(dto: CreateUserDto, actorId: number) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email đã tồn tại');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        role_id: dto.role_id,
        full_name: dto.full_name,
        email: dto.email,
        password_hash: hashed,
        phone: dto.phone,
        status: dto.status || 'active',
      },
      include: { role: true },
    });
    const { password_hash, ...result } = user;
    await this.activityLogs.log(actorId, 'CREATE', 'users', result.user_id, `Tạo người dùng: ${result.email}`);
    return result;
  }

  async update(id: number, dto: UpdateUserDto, actorId: number) {
    await this.findOne(id);
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
    const { password_hash, ...result } = user;
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
    const { password_hash, ...result } = user;
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
    const deleted = await this.prisma.user.delete({ where: { user_id: id } });
    await this.activityLogs.log(actorId, 'DELETE', 'users', id, `Xóa nguoi dung: ${user.email}`);
    return deleted;
  }

  async updateStatus(id: number, status: string, actorId: number) {
    const user = await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { user_id: id },
      data: { status },
    });
    await this.activityLogs.log(actorId, 'STATUS_CHANGE', 'users', id, `Doi trang thai nguoi dung ${user.email} -> ${status}`);
    return updated;
  }
}
