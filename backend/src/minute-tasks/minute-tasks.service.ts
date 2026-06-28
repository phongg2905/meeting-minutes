import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateMinuteTaskDto } from './dto/create-minute-task.dto';
import { UpdateMinuteTaskDto } from './dto/update-minute-task.dto';
import { canManageMinute, canWriteMinutes, isPublicMinute, isSystemAdmin } from '../auth/roles.constants';

@Injectable()
export class MinuteTasksService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  async findByMinute(minuteId: number, userId: number, roleId: number) {
    await this.assertMinuteAccess(minuteId, userId, roleId);
    return this.prisma.minuteTask.findMany({ where: { minute_id: minuteId }, orderBy: { task_id: 'asc' } });
  }

  async create(minuteId: number, userId: number, roleId: number, data: CreateMinuteTaskDto) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    await this.assertMinuteWriteAccess(minuteId, userId, roleId);
    const task = await this.prisma.minuteTask.create({
      data: { ...data, minute_id: minuteId, deadline: data.deadline ? new Date(data.deadline) : null },
    });
    await this.activityLogs.log(userId, 'CREATE', 'minute_tasks', task.task_id, `Tạo nhiệm vụ cho biên bản ${minuteId}`);
    return task;
  }

  async update(id: number, userId: number, roleId: number, data: UpdateMinuteTaskDto) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    const task = await this.prisma.minuteTask.findUnique({ where: { task_id: id } });
    if (!task) throw new NotFoundException('Không tìm thấy nhiệm vụ');
    await this.assertMinuteWriteAccess(task.minute_id, userId, roleId);
    const updated = await this.prisma.minuteTask.update({
      where: { task_id: id },
      data: { ...data, deadline: data.deadline ? new Date(data.deadline) : undefined },
    });
    await this.activityLogs.log(userId, 'UPDATE', 'minute_tasks', id, `Cập nhật nhiệm vụ ${id}`);
    return updated;
  }

  async remove(id: number, userId: number, roleId: number) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    const task = await this.prisma.minuteTask.findUnique({ where: { task_id: id } });
    if (!task) throw new NotFoundException('Không tìm thấy nhiệm vụ');
    await this.assertMinuteWriteAccess(task.minute_id, userId, roleId);
    const deleted = await this.prisma.minuteTask.delete({ where: { task_id: id } });
    await this.activityLogs.log(userId, 'DELETE', 'minute_tasks', id, `Xóa nhiệm vụ ${id}`);
    return deleted;
  }

  private async assertMinuteAccess(minuteId: number, userId: number, roleId: number) {
    const minute = await this.prisma.meetingMinute.findUnique({ where: { minute_id: minuteId } });
    if (!minute) throw new NotFoundException('Không tìm thấy biên bản');
    if (!isSystemAdmin(roleId) && minute.created_by !== userId && !(minute.status === 'completed' && isPublicMinute(minute))) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào biên bản này');
    }
    return minute;
  }

  private async assertMinuteWriteAccess(minuteId: number, userId: number, roleId: number) {
    const minute = await this.assertMinuteAccess(minuteId, userId, roleId);
    if (!canManageMinute(roleId, userId, minute.created_by)) {
      throw new ForbiddenException('Bạn không có quyền thay đổi nhiệm vụ của biên bản này');
    }
  }
}
