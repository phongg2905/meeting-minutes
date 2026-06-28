import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateMinuteParticipantDto } from './dto/create-minute-participant.dto';
import { UpdateMinuteParticipantDto } from './dto/update-minute-participant.dto';
import { canManageMinute, canWriteMinutes, isPublicMinute, isSystemAdmin } from '../auth/roles.constants';

@Injectable()
export class MinuteParticipantsService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  async findByMinute(minuteId: number, userId: number, roleId: number) {
    await this.assertMinuteAccess(minuteId, userId, roleId);
    return this.prisma.minuteParticipant.findMany({ where: { minute_id: minuteId }, orderBy: { participant_id: 'asc' } });
  }

  async create(minuteId: number, userId: number, roleId: number, data: CreateMinuteParticipantDto) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    await this.assertMinuteWriteAccess(minuteId, userId, roleId);
    const participant = await this.prisma.minuteParticipant.create({ data: { ...data, minute_id: minuteId } });
    await this.activityLogs.log(userId, 'CREATE', 'minute_participants', participant.participant_id, `Thêm người tham dự cho biên bản ${minuteId}`);
    return participant;
  }

  async update(id: number, userId: number, roleId: number, data: UpdateMinuteParticipantDto) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    const participant = await this.prisma.minuteParticipant.findUnique({ where: { participant_id: id } });
    if (!participant) throw new NotFoundException('Không tìm thấy người tham dự');
    await this.assertMinuteWriteAccess(participant.minute_id, userId, roleId);
    const updated = await this.prisma.minuteParticipant.update({ where: { participant_id: id }, data });
    await this.activityLogs.log(userId, 'UPDATE', 'minute_participants', id, `Cập nhật người tham dự ${id}`);
    return updated;
  }

  async remove(id: number, userId: number, roleId: number) {
    if (!canWriteMinutes(roleId)) throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    const participant = await this.prisma.minuteParticipant.findUnique({ where: { participant_id: id } });
    if (!participant) throw new NotFoundException('Không tìm thấy người tham dự');
    await this.assertMinuteWriteAccess(participant.minute_id, userId, roleId);
    const deleted = await this.prisma.minuteParticipant.delete({ where: { participant_id: id } });
    await this.activityLogs.log(userId, 'DELETE', 'minute_participants', id, `Xóa người tham dự ${id}`);
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
      throw new ForbiddenException('Bạn không có quyền thay đổi người tham dự của biên bản này');
    }
  }
}
