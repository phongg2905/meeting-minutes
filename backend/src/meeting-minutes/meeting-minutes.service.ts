import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateMeetingMinuteDto } from './dto/create-meeting-minute.dto';
import { UpdateMeetingMinuteDto } from './dto/update-meeting-minute.dto';
import { QueryMeetingMinuteDto } from './dto/query-meeting-minute.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  MINUTE_STATUS_COMPLETED,
  MINUTE_STATUS_DRAFT,
  ROLE_ADMIN,
  ROLE_SEARCH_USER,
  ROLE_STANDARD_USER,
  canManageMinute,
  canWriteMinutes,
  isPublicMinute,
  isSystemAdmin,
} from '../auth/roles.constants';

@Injectable()
export class MeetingMinutesService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
    private notifications: NotificationsService,
  ) {}

  async findAll(query: QueryMeetingMinuteDto, userId: number, roleId: number) {
    const where: any = {};
    if (!isSystemAdmin(roleId)) {
      where.OR = [
        ...(canWriteMinutes(roleId) ? [{ created_by: userId }] : []),
        { status: MINUTE_STATUS_COMPLETED, is_public: true, creator: { status: 'active' } },
      ];
    }
    this.applyFilters(where, query);

    const [data, total] = await Promise.all([
      this.prisma.meetingMinute.findMany({
        where,
        include: {
          minute_type: true,
          creator: { select: { user_id: true, full_name: true } },
          _count: { select: { tasks: true, participants: true, attachments: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: query.page ? (Number(query.page) - 1) * (Number(query.limit) || 10) : 0,
        take: Number(query.limit) || 10,
      }),
      this.prisma.meetingMinute.count({ where }),
    ]);

    return { data, total, page: Number(query.page) || 1, limit: Number(query.limit) || 10 };
  }

  async findPublic(query: QueryMeetingMinuteDto) {
    const where: any = { status: MINUTE_STATUS_COMPLETED, is_public: true, creator: { status: 'active' } };
    this.applyFilters(where, query, true);

    const [data, total] = await Promise.all([
      this.prisma.meetingMinute.findMany({
        where,
        include: {
          minute_type: true,
          creator: { select: { user_id: true, full_name: true } },
          _count: { select: { tasks: true, participants: true, attachments: true } },
        },
        orderBy: { meeting_date: 'desc' },
        skip: query.page ? (Number(query.page) - 1) * (Number(query.limit) || 10) : 0,
        take: Number(query.limit) || 10,
      }),
      this.prisma.meetingMinute.count({ where }),
    ]);

    return { data, total, page: Number(query.page) || 1, limit: Number(query.limit) || 10 };
  }

  async findOne(id: number, userId: number, roleId: number) {
    const minute = await this.prisma.meetingMinute.findUnique({
      where: { minute_id: id },
      include: {
        minute_type: true,
        creator: { select: { user_id: true, full_name: true, email: true, status: true } },
        tasks: { orderBy: { task_id: 'asc' } },
        participants: { orderBy: { participant_id: 'asc' } },
        attachments: {
          include: { uploader: { select: { user_id: true, full_name: true } } },
          orderBy: { uploaded_at: 'desc' },
        },
      },
    });
    if (!minute) throw new NotFoundException('Không tìm thấy biên bản');
    const creatorInactive = minute.creator && (minute.creator as any).status === 'inactive';
    if (!isSystemAdmin(roleId) && creatorInactive) throw new NotFoundException('Không tìm thấy biên bản');
    if (!isSystemAdmin(roleId) && minute.created_by !== userId && !this.isVisibleToNonOwner(minute)) {
      throw new ForbiddenException('Ban khong co quyen xem biên bản nay');
    }
    return minute;
  }

  async findPublicOne(id: number) {
    const minute = await this.prisma.meetingMinute.findUnique({
      where: { minute_id: id },
      include: {
        minute_type: true,
        creator: { select: { user_id: true, full_name: true, status: true } },
      },
    });
    if (!minute || !this.isVisibleToNonOwner(minute) || (minute.creator as any)?.status !== 'active') {
      throw new NotFoundException('Không tìm thấy biên bản cong khai');
    }
    return this.toPublicSummary(minute);
  }

  async create(dto: CreateMeetingMinuteDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { user_id: userId } });
    if (!canWriteMinutes(user?.role_id)) {
      throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    }
    const requestedStatus = dto.status || MINUTE_STATUS_DRAFT;
    if (!this.isValidStatus(requestedStatus)) throw new BadRequestException('Trạng thái biên bản khong hop le');
    if (dto.is_public && requestedStatus !== MINUTE_STATUS_COMPLETED) {
      throw new BadRequestException('Chi biên bản hoan tat moi duoc cong khai');
    }
    if (dto.is_public) this.assertPublicDataIsSafe(dto);
    this.validateMeetingTime(dto.start_time, dto.end_time);

    let minute;
    try {
      minute = await this.prisma.meetingMinute.create({
        data: {
          minute_code: dto.minute_code || await this.generateCode(),
          type_id: dto.type_id,
          created_by: userId,
          title: dto.title,
          class_name: dto.class_name,
          meeting_date: new Date(dto.meeting_date),
          start_time: new Date(`1970-01-01T${dto.start_time}:00`),
          end_time: new Date(`1970-01-01T${dto.end_time}:00`),
          location: dto.location,
          meeting_form: dto.meeting_form,
          host_name: dto.host_name,
          secretary_name: dto.secretary_name,
          attendee_summary: dto.attendee_summary,
          absentee_summary: dto.absentee_summary,
          purpose: dto.purpose,
          discussion_content: dto.discussion_content,
          conclusion_content: dto.conclusion_content,
          followup_summary: dto.followup_summary,
          status: requestedStatus,
          is_public: dto.is_public || false,
          published_at: dto.is_public ? new Date() : undefined,
          reviewed_by: undefined,
          reviewed_at: undefined,
          review_note: dto.review_note,
          participants: dto.participants ? { createMany: { data: this.toParticipantCreateData(dto.participants) } } : undefined,
          tasks: dto.tasks ? { createMany: { data: this.toTaskCreateData(dto.tasks) } } : undefined,
        },
        include: { minute_type: true, participants: true, tasks: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Mã biên bản da ton tai, vui long tao lai hoac bo trong de he thong tu sinh ma moi');
      }
      throw error;
    }
    await this.activityLogs.log(userId, 'CREATE', 'meeting_minutes', minute.minute_id, `Tạo biên bản: ${minute.title}`);
    await this.notifications.createForRoles([ROLE_ADMIN], {
      title: 'Biên bản mới',
      message: `${minute.minute_code} - ${minute.title}`,
      type: 'minute',
      target_table: 'meeting_minutes',
      target_id: minute.minute_id,
    }, [userId]);
    return minute;
  }

  async update(id: number, dto: UpdateMeetingMinuteDto, userId: number, roleId: number) {
    const existing = await this.findOne(id, userId, roleId);
    if (!canManageMinute(roleId, userId, existing.created_by)) {
      throw new ForbiddenException('Không có quyền chỉnh sửa');
    }
    if (dto.status && !this.isValidStatus(dto.status)) throw new BadRequestException('Trạng thái biên bản khong hop le');
    const nextStatus = dto.status;
    const nextIsPublic = dto.is_public;
    if ((nextIsPublic ?? existing.is_public) && (nextStatus ?? existing.status) !== MINUTE_STATUS_COMPLETED) {
      throw new BadRequestException('Chi biên bản hoan tat moi duoc cong khai');
    }
    if (nextIsPublic ?? existing.is_public) {
      this.assertPublicDataIsSafe({ ...existing, ...dto });
    }

    this.validateMeetingTime(
      dto.start_time ?? this.toTimeString(existing.start_time),
      dto.end_time ?? this.toTimeString(existing.end_time),
    );

    const minute = await this.prisma.$transaction(async (tx) => {
      if (dto.participants) await tx.minuteParticipant.deleteMany({ where: { minute_id: id } });
      if (dto.tasks) await tx.minuteTask.deleteMany({ where: { minute_id: id } });

      return tx.meetingMinute.update({
        where: { minute_id: id },
        data: {
          type_id: dto.type_id,
          title: dto.title,
          class_name: dto.class_name,
          meeting_date: dto.meeting_date ? new Date(dto.meeting_date) : undefined,
          start_time: dto.start_time ? new Date(`1970-01-01T${dto.start_time}:00`) : undefined,
          end_time: dto.end_time ? new Date(`1970-01-01T${dto.end_time}:00`) : undefined,
          location: dto.location,
          meeting_form: dto.meeting_form,
          host_name: dto.host_name,
          secretary_name: dto.secretary_name,
          attendee_summary: dto.attendee_summary,
          absentee_summary: dto.absentee_summary,
          purpose: dto.purpose,
          discussion_content: dto.discussion_content,
          conclusion_content: dto.conclusion_content,
          followup_summary: dto.followup_summary,
          status: nextStatus,
          is_public: nextIsPublic,
          published_at: nextIsPublic ? new Date() : nextIsPublic === false ? null : undefined,
          reviewed_by: undefined,
          reviewed_at: undefined,
          review_note: dto.review_note,
          participants: dto.participants ? { createMany: { data: this.toParticipantCreateData(dto.participants) } } : undefined,
          tasks: dto.tasks ? { createMany: { data: this.toTaskCreateData(dto.tasks) } } : undefined,
        },
        include: { minute_type: true, participants: true, tasks: true },
      });
    });

    await this.activityLogs.log(
      userId,
      'UPDATE',
      'meeting_minutes',
      id,
      `Cập nhật biên bản: ${minute.title}`,
    );
    return minute;
  }

  async updateStatus(id: number, status: string, userId: number, roleId: number, reviewNote?: string) {
    if (!this.isValidStatus(status)) throw new BadRequestException('Trạng thái biên bản khong hop le');
    const existing = await this.findOne(id, userId, roleId);
    if (!canManageMinute(roleId, userId, existing.created_by)) {
      throw new ForbiddenException('Ban chi duoc cap nhat trang thai biên bản do minh tao');
    }
    if (existing.is_public) this.assertPublicDataIsSafe(existing);
    if (status === MINUTE_STATUS_DRAFT && existing.is_public) {
      throw new BadRequestException('Hay tat cong khai truoc khi chuyen biên bản ve dang chinh sua');
    }

    const minute = await this.prisma.meetingMinute.update({
      where: { minute_id: id },
      data: {
        status,
        is_public: existing.is_public,
        published_at: existing.published_at,
        reviewed_by: null,
        reviewed_at: null,
        review_note: reviewNote,
      },
    });
    await this.activityLogs.log(userId, 'STATUS_CHANGE', 'meeting_minutes', id, `Đổi trạng thái -> ${status}`);
    return minute;
  }

  async updatePublic(id: number, isPublic: boolean, userId: number, roleId: number) {
    const existing = await this.findOne(id, userId, roleId);
    if (!canManageMinute(roleId, userId, existing.created_by)) {
      throw new ForbiddenException('Ban chi duoc cong khai/an biên bản do minh tao');
    }
    if (isPublic && existing.status !== MINUTE_STATUS_COMPLETED) {
      throw new BadRequestException('Chi biên bản hoan tat moi duoc cong khai');
    }
    if (isPublic) this.assertPublicDataIsSafe(existing);

    const minute = await this.prisma.meetingMinute.update({
      where: { minute_id: id },
      data: { is_public: isPublic, published_at: isPublic ? new Date() : null },
    });
    await this.activityLogs.log(userId, 'PUBLIC_CHANGE', 'meeting_minutes', id, `${isPublic ? 'Công khai' : 'Ẩn'} biên bản`);
    if (isPublic) {
      await this.notifications.createForRoles([ROLE_SEARCH_USER, ROLE_STANDARD_USER], {
        title: 'Có biên bản công khai mới',
        message: `${existing.minute_code} - ${existing.title}`,
        type: 'minute',
        target_table: 'meeting_minutes',
        target_id: id,
      }, [userId]);
    }
    return minute;
  }

  async remove(id: number, userId: number, roleId: number) {
    const existing = await this.findOne(id, userId, roleId);
    if (!canManageMinute(roleId, userId, existing.created_by)) {
      throw new ForbiddenException('Không có quyền xóa');
    }
    await this.prisma.meetingMinute.delete({ where: { minute_id: id } });
    await this.activityLogs.log(userId, 'DELETE', 'meeting_minutes', id, `Xóa biên bản: ${existing.title}`);
    return { message: 'Xóa biên bản thành công' };
  }

  private applyFilters(where: any, query: QueryMeetingMinuteDto, publicOnly = false) {
    if (!publicOnly && query.status) where.status = query.status;
    if (!publicOnly && query.is_public) where.is_public = query.is_public === 'true';
    if (query.type_id) where.type_id = Number(query.type_id);
    if (query.class_name) where.class_name = { contains: query.class_name, mode: 'insensitive' };
    if (!publicOnly && query.host_name) where.host_name = { contains: query.host_name, mode: 'insensitive' };
    if (!publicOnly && query.secretary_name) where.secretary_name = { contains: query.secretary_name, mode: 'insensitive' };
    if (query.meeting_form) where.meeting_form = { contains: query.meeting_form, mode: 'insensitive' };
    if (query.date_from || query.date_to) {
      where.meeting_date = {};
      if (query.date_from) where.meeting_date.gte = new Date(query.date_from);
      if (query.date_to) where.meeting_date.lte = new Date(query.date_to);
    }
    if (query.search) {
      const searchOr = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { minute_code: { contains: query.search, mode: 'insensitive' } },
        { class_name: { contains: query.search, mode: 'insensitive' } },
        ...(publicOnly ? [] : [
          { host_name: { contains: query.search, mode: 'insensitive' } },
          { secretary_name: { contains: query.search, mode: 'insensitive' } },
        ]),
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }
  }

  private toPublicSummary(minute: any) {
    return {
      minute_id: minute.minute_id,
      minute_code: minute.minute_code,
      title: minute.title,
      class_name: minute.class_name,
      meeting_date: minute.meeting_date,
      start_time: minute.start_time,
      end_time: minute.end_time,
      location: minute.location,
      host_name: minute.host_name,
      secretary_name: minute.secretary_name,
      status: minute.status,
      is_public: minute.is_public,
      published_at: minute.published_at,
      created_at: minute.created_at,
      updated_at: minute.updated_at,
      minute_type: minute.minute_type,
      creator: minute.creator ? { user_id: minute.creator.user_id, full_name: minute.creator.full_name } : undefined,
    };
  }

  private async generateCode(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const latest = await this.prisma.meetingMinute.findFirst({
      orderBy: { minute_id: 'desc' },
      select: { minute_id: true },
    });
    const nextId = (latest?.minute_id || 0) + 1;
    return this.formatMinuteCode(yearMonth, nextId);
  }

  private formatMinuteCode(yearMonth: string, id: number) {
    return `BB-${yearMonth}-${String(id).padStart(4, '0')}`;
  }

  private validateMeetingTime(startTime?: string, endTime?: string) {
    if (!startTime || !endTime) return;
    if (startTime >= endTime) throw new BadRequestException('Giờ kết thúc phai sau gio bat dau');
  }

  private toTimeString(date: Date) {
    return date.toISOString().slice(11, 16);
  }

  private isValidStatus(status: string) {
    return [
      MINUTE_STATUS_DRAFT,
      MINUTE_STATUS_COMPLETED,
    ].includes(status);
  }

  private isVisibleToNonOwner(minute: { status?: string; is_public?: boolean }) {
    return minute.status === MINUTE_STATUS_COMPLETED && isPublicMinute(minute);
  }

  private toParticipantCreateData(participants: any[]) {
    return participants.map((participant) => ({
      full_name: participant.full_name,
      role_in_meeting: participant.role_in_meeting,
      attendance_status: participant.attendance_status,
    }));
  }

  private toTaskCreateData(tasks: any[]) {
    return tasks.map((task) => ({
      task_content: task.task_content,
      assigned_to: task.assigned_to,
      deadline: task.deadline ? new Date(task.deadline) : null,
      task_status: task.task_status,
    }));
  }

  private assertPublicDataIsSafe(data: any) {
    const values = [
      data.title,
      data.class_name,
      data.location,
      data.meeting_form,
      data.host_name,
      data.secretary_name,
      data.attendee_summary,
      data.absentee_summary,
      data.purpose,
      data.discussion_content,
      data.conclusion_content,
      data.followup_summary,
      ...(data.participants || []).flatMap((item: any) => [item.full_name, item.role_in_meeting]),
      ...(data.tasks || []).flatMap((item: any) => [item.task_content, item.assigned_to]),
    ].filter(Boolean);
    const joined = values.join('\n');
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(joined) || /(?:\+?84|0)(?:\d[\s.-]?){8,10}\d/.test(joined)) {
      throw new BadRequestException('Nội dung biên bản có email hoặc số điện thoại cá nhân. Hãy gỡ bỏ trước khi công khai.');
    }
  }
}
