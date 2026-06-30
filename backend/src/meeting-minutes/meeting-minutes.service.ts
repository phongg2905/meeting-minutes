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
  ROLE_MINUTE_MANAGER,
  ROLE_STANDARD_USER,
  canManageMinute,
  canWriteMinutes,
  isPublicMinute,
  isSystemAdmin,
} from '../auth/roles.constants';
import { USER_STATUS_ACTIVE } from '../users/user.constants';

type MinuteViewScope = 'owner' | 'authenticated_public' | 'public';

@Injectable()
export class MeetingMinutesService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
    private notifications: NotificationsService,
  ) {}

  async findAll(query: QueryMeetingMinuteDto, userId: number, roleId: number) {
    const where: any = {};
    if (query.mine === 'true') {
      where.created_by = userId;
    } else if (!isSystemAdmin(roleId)) {
      where.OR = [
        ...(canWriteMinutes(roleId) ? [{ created_by: userId }] : []),
        { status: MINUTE_STATUS_COMPLETED, is_public: true, creator: { status: USER_STATUS_ACTIVE } },
      ];
    }
    this.applyFilters(where, query);

    const [data, total] = await Promise.all([
      this.prisma.meetingMinute.findMany({
        where,
        include: {
          minute_type: { select: { type_id: true, type_name: true } },
          creator: { select: { user_id: true, full_name: true } },
          attachments: { select: { is_public_safe: true } },
          _count: { select: { tasks: true, participants: true, attachments: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: query.page ? (Number(query.page) - 1) * (Number(query.limit) || 10) : 0,
        take: Number(query.limit) || 10,
      }),
      this.prisma.meetingMinute.count({ where }),
    ]);

    return {
      data: data.map((minute) => {
        const scope = isSystemAdmin(roleId) || minute.created_by === userId ? 'owner' : 'authenticated_public';
        return this.toListItem(minute, scope);
      }),
      total,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    };
  }

  async findPublic(query: QueryMeetingMinuteDto) {
    const where: any = { status: MINUTE_STATUS_COMPLETED, is_public: true, creator: { status: USER_STATUS_ACTIVE } };
    this.applyFilters(where, query, true);

    const [data, total] = await Promise.all([
      this.prisma.meetingMinute.findMany({
        where,
        include: {
          minute_type: { select: { type_id: true, type_name: true } },
          creator: { select: { user_id: true, full_name: true } },
          attachments: { select: { is_public_safe: true } },
          _count: { select: { tasks: true, participants: true, attachments: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: query.page ? (Number(query.page) - 1) * (Number(query.limit) || 10) : 0,
        take: Number(query.limit) || 10,
      }),
      this.prisma.meetingMinute.count({ where }),
    ]);

    return {
      data: data.map((minute) => this.toListItem(minute, 'public')),
      total,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    };
  }

  async getDashboard(userId: number, roleId: number) {
    const where = this.buildAccessWhere(userId, roleId);

    const [total, publicCount, editingCount, recentMinutes] = await Promise.all([
      this.prisma.meetingMinute.count({ where }),
      this.prisma.meetingMinute.count({
        where: { ...where, is_public: true },
      }),
      this.prisma.meetingMinute.count({
        where: { ...where, status: MINUTE_STATUS_DRAFT },
      }),
      this.prisma.meetingMinute.findMany({
        where,
        include: {
          minute_type: { select: { type_id: true, type_name: true } },
          creator: { select: { user_id: true, full_name: true } },
          attachments: { select: { is_public_safe: true } },
          _count: { select: { tasks: true, participants: true, attachments: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    return {
      stats: {
        total,
        public: publicCount,
        private: Math.max(total - publicCount, 0),
        editing: editingCount,
      },
      recentMinutes: recentMinutes.map((minute) => this.toListItem(
        minute,
        isSystemAdmin(roleId) || minute.created_by === userId ? 'owner' : 'authenticated_public',
      )),
    };
  }

  async findOne(id: number, userId: number, roleId: number) {
    const minute = await this.prisma.meetingMinute.findUnique({
      where: { minute_id: id },
      include: {
        minute_type: { select: { type_id: true, type_name: true } },
        creator: { select: { user_id: true, full_name: true, status: true } },
        tasks: { orderBy: { task_id: 'asc' } },
        participants: { orderBy: { participant_id: 'asc' } },
        attachments: {
          include: { uploader: { select: { user_id: true, full_name: true } } },
          orderBy: { uploaded_at: 'desc' },
        },
      },
    });
    if (!minute) throw new NotFoundException('Không tìm thấy biên bản');

    const scope = this.resolveDetailScope(minute, userId, roleId);
    if (scope === 'owner') return this.toOwnerDetail(minute);
    return this.toAuthenticatedPublicDetail(minute);
  }

  async findPublicOne(id: number) {
    const minute = await this.prisma.meetingMinute.findUnique({
      where: { minute_id: id },
      include: {
        minute_type: { select: { type_id: true, type_name: true } },
        creator: { select: { user_id: true, full_name: true, status: true } },
        tasks: { orderBy: { task_id: 'asc' } },
        participants: { orderBy: { participant_id: 'asc' } },
        attachments: {
          include: { uploader: { select: { user_id: true, full_name: true } } },
          orderBy: { uploaded_at: 'desc' },
        },
      },
    });
    if (!minute || !this.isPubliclyVisible(minute)) {
      throw new NotFoundException('Không tìm thấy biên bản công khai');
    }
    return this.toPublicDetail(minute);
  }

  async create(dto: CreateMeetingMinuteDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { user_id: userId } });
    if (!canWriteMinutes(user?.role_id)) {
      throw new ForbiddenException('Tài khoản này chỉ được tra cứu');
    }
    const requestedStatus = dto.status || MINUTE_STATUS_DRAFT;
    if (!this.isValidStatus(requestedStatus)) throw new BadRequestException('Trạng thái biên bản không hợp lệ');
    if (dto.is_public && requestedStatus !== MINUTE_STATUS_COMPLETED) {
      throw new BadRequestException('Chỉ biên bản hoàn tất mới được công khai');
    }
    if (dto.is_public) this.assertPublicDataIsSafe(dto);
    this.validateMeetingTime(dto.start_time, dto.end_time);
    const minuteCode = this.normalizeMinuteCode(dto.minute_code);
    if (!minuteCode) throw new BadRequestException('Vui lòng nhập mã biên bản');

    let minute;
    try {
      minute = await this.prisma.meetingMinute.create({
        data: {
          minute_code: minuteCode,
          type_id: dto.type_id,
          created_by: userId,
          title: dto.title,
          class_name: dto.class_name,
          meeting_date: new Date(dto.meeting_date),
          start_time: this.parseTimeString(dto.start_time),
          end_time: this.parseTimeString(dto.end_time),
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
          template_data: dto.template_data as Prisma.InputJsonValue,
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
      this.handlePrismaWriteError(error);
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
    if (dto.status && !this.isValidStatus(dto.status)) throw new BadRequestException('Trạng thái biên bản không hợp lệ');
    const nextStatus = dto.status;
    const nextIsPublic = dto.is_public;
    if ((nextIsPublic ?? existing.is_public) && (nextStatus ?? existing.status) !== MINUTE_STATUS_COMPLETED) {
      throw new BadRequestException('Chỉ biên bản hoàn tất mới được công khai');
    }
    if (nextIsPublic ?? existing.is_public) {
      this.assertPublicDataIsSafe({ ...existing, ...dto });
    }

    this.validateMeetingTime(
      dto.start_time ?? this.toTimeString(existing.start_time),
      dto.end_time ?? this.toTimeString(existing.end_time),
    );

    let minute;
    try {
      minute = await this.prisma.$transaction(async (tx) => {
        if (dto.participants) await tx.minuteParticipant.deleteMany({ where: { minute_id: id } });
        if (dto.tasks) await tx.minuteTask.deleteMany({ where: { minute_id: id } });

        const minuteCode = dto.minute_code === undefined ? undefined : this.normalizeMinuteCode(dto.minute_code);
        if (minuteCode === '') throw new BadRequestException('Vui lòng nhập mã biên bản');

        return tx.meetingMinute.update({
          where: { minute_id: id },
          data: {
            minute_code: minuteCode,
            type_id: dto.type_id,
            title: dto.title,
            class_name: dto.class_name,
            meeting_date: dto.meeting_date ? new Date(dto.meeting_date) : undefined,
            start_time: dto.start_time ? this.parseTimeString(dto.start_time) : undefined,
            end_time: dto.end_time ? this.parseTimeString(dto.end_time) : undefined,
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
            template_data: dto.template_data as Prisma.InputJsonValue,
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
    } catch (error) {
      this.handlePrismaWriteError(error);
    }

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
    if (!this.isValidStatus(status)) throw new BadRequestException('Trạng thái biên bản không hợp lệ');
    const existing = await this.findOne(id, userId, roleId);
    if (!canManageMinute(roleId, userId, existing.created_by)) {
      throw new ForbiddenException('Bạn chỉ được cập nhật trạng thái biên bản do mình tạo');
    }
    if (existing.is_public) this.assertPublicDataIsSafe(existing);
    if (status === MINUTE_STATUS_DRAFT && existing.is_public) {
      throw new BadRequestException('Hãy tắt công khai trước khi chuyển biên bản về dạng chỉnh sửa');
    }

    // Fetch raw minute to preserve reviewed_by/reviewed_at fields not included in sanitized response
    const rawMinute = await this.prisma.meetingMinute.findUnique({
      where: { minute_id: id },
      select: { reviewed_by: true, reviewed_at: true, review_note: true, is_public: true, published_at: true },
    });

    const minute = await this.prisma.meetingMinute.update({
      where: { minute_id: id },
      data: {
        status,
        is_public: rawMinute?.is_public ?? existing.is_public,
        published_at: rawMinute?.published_at ?? existing.published_at,
        reviewed_by: rawMinute?.reviewed_by ?? null,
        reviewed_at: rawMinute?.reviewed_at ?? null,
        review_note: reviewNote ?? rawMinute?.review_note,
      },
    });
    await this.activityLogs.log(userId, 'STATUS_CHANGE', 'meeting_minutes', id, `Đổi trạng thái -> ${status}`);
    return minute;
  }

  async updatePublic(id: number, isPublic: boolean, userId: number, roleId: number) {
    const existing = await this.findOne(id, userId, roleId);
    if (!canManageMinute(roleId, userId, existing.created_by)) {
      throw new ForbiddenException('Bạn chỉ được công khai/ẩn biên bản do mình tạo');
    }
    if (isPublic && existing.status !== MINUTE_STATUS_COMPLETED) {
      throw new BadRequestException('Chỉ biên bản hoàn tất mới được công khai');
    }
    if (isPublic) this.assertPublicDataIsSafe(existing);

    const minute = await this.prisma.meetingMinute.update({
      where: { minute_id: id },
      data: { is_public: isPublic, published_at: isPublic ? new Date() : null },
    });
    await this.activityLogs.log(userId, 'PUBLIC_CHANGE', 'meeting_minutes', id, `${isPublic ? 'Công khai' : 'Ẩn'} biên bản`);
    if (isPublic) {
      await this.notifications.createForRoles([ROLE_STANDARD_USER, ROLE_MINUTE_MANAGER], {
        title: 'Có biên bản công khai mới',
        message: `${existing.minute_code} - ${existing.title}`,
        type: 'minute',
        target_table: 'meeting_minutes',
        target_id: id,
      }, [userId]);
    } else if (existing.is_public) {
      // Biên bản vừa bị thu hồi công khai → thông báo cho người dùng không phải Admin
      await this.notifications.createForRoles([ROLE_STANDARD_USER, ROLE_MINUTE_MANAGER], {
        title: 'Biên bản công khai đã bị thu hồi',
        message: `Biên bản "${existing.minute_code} - ${existing.title}" không còn được công khai`,
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
      if (query.date_from) where.meeting_date.gte = this.parseDateSafe(query.date_from);
      if (query.date_to) where.meeting_date.lte = this.parseDateSafe(query.date_to);
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

  private buildAccessWhere(userId: number, roleId: number) {
    const where: any = {};
    if (!isSystemAdmin(roleId)) {
      where.OR = [
        ...(canWriteMinutes(roleId) ? [{ created_by: userId }] : []),
        { status: MINUTE_STATUS_COMPLETED, is_public: true, creator: { status: USER_STATUS_ACTIVE } },
      ];
    }
    return where;
  }

  private toListItem(minute: any, scope: MinuteViewScope) {
    const safeCreator = minute.creator
      ? {
          user_id: minute.creator.user_id,
          full_name: minute.creator.full_name,
        }
      : undefined;

    const safeAttachmentCount = Array.isArray(minute.attachments)
      ? minute.attachments.filter((attachment: any) => attachment.is_public_safe).length
      : minute._count?.attachments;

    return {
          minute_id: minute.minute_id,
          minute_code: minute.minute_code,
          created_by: minute.created_by,
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
      creator: safeCreator,
      _count: minute._count ? {
        tasks: minute._count.tasks,
        participants: minute._count.participants,
        attachments: scope === 'owner' ? minute._count.attachments : safeAttachmentCount,
      } : undefined,
    };
  }

  private toOwnerDetail(minute: any) {
    return {
          minute_id: minute.minute_id,
          minute_code: minute.minute_code,
          type_id: minute.type_id,
          created_by: minute.created_by,
      title: minute.title,
      class_name: minute.class_name,
      meeting_date: minute.meeting_date,
      start_time: minute.start_time,
      end_time: minute.end_time,
      location: minute.location,
      meeting_form: minute.meeting_form,
      host_name: minute.host_name,
      secretary_name: minute.secretary_name,
      attendee_summary: minute.attendee_summary,
      absentee_summary: minute.absentee_summary,
      purpose: minute.purpose,
      discussion_content: minute.discussion_content,
      conclusion_content: minute.conclusion_content,
      followup_summary: minute.followup_summary,
      template_data: minute.template_data,
      status: minute.status,
      reviewed_by: minute.reviewed_by,
      reviewed_at: minute.reviewed_at,
      review_note: minute.review_note,
      created_at: minute.created_at,
      updated_at: minute.updated_at,
      is_public: minute.is_public,
      published_at: minute.published_at,
      minute_type: minute.minute_type,
      creator: minute.creator
        ? {
            user_id: minute.creator.user_id,
            full_name: minute.creator.full_name,
          }
        : undefined,
      tasks: minute.tasks,
      participants: minute.participants,
      attachments: (minute.attachments || []).map((attachment: any) => this.toOwnerAttachment(attachment)),
    };
  }

  private toAuthenticatedPublicDetail(minute: any) {
    return this.toPublicDetail(minute);
  }

  private toPublicDetail(minute: any) {
    return {
      minute_id: minute.minute_id,
      minute_code: minute.minute_code,
      type_id: minute.type_id,
      created_by: minute.created_by,
      title: minute.title,
      class_name: minute.class_name,
      meeting_date: minute.meeting_date,
      start_time: minute.start_time,
      end_time: minute.end_time,
      location: minute.location,
      meeting_form: minute.meeting_form,
      host_name: minute.host_name,
      secretary_name: minute.secretary_name,
      attendee_summary: minute.attendee_summary,
      absentee_summary: minute.absentee_summary,
      purpose: minute.purpose,
      discussion_content: minute.discussion_content,
      conclusion_content: minute.conclusion_content,
      followup_summary: minute.followup_summary,
      template_data: minute.template_data,
      status: minute.status,
      created_at: minute.created_at,
      updated_at: minute.updated_at,
      is_public: minute.is_public,
      published_at: minute.published_at,
      minute_type: minute.minute_type,
      creator: minute.creator
        ? {
            user_id: minute.creator.user_id,
            full_name: minute.creator.full_name,
          }
        : undefined,
      participants: minute.participants,
      tasks: minute.tasks,
      attachments: (minute.attachments || [])
        .filter((attachment: any) => attachment.is_public_safe)
        .map((attachment: any) => this.toPublicAttachment(attachment)),
    };
  }

  private toOwnerAttachment(attachment: any) {
    const { file_path, ...safeAttachment } = attachment;
    return safeAttachment;
  }

  private toPublicAttachment(attachment: any) {
    return {
      attachment_id: attachment.attachment_id,
      minute_id: attachment.minute_id,
      file_name: attachment.file_name,
      file_type: attachment.file_type,
      is_public_safe: attachment.is_public_safe,
      uploaded_at: attachment.uploaded_at,
    };
  }

  private normalizeMinuteCode(code?: string) {
    return code?.trim();
  }

  private handlePrismaWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Mã biên bản đã tồn tại, vui lòng nhập mã khác');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Loại biên bản hoặc dữ liệu liên kết không hợp lệ');
      }
    }
    throw error;
  }

  private validateMeetingTime(startTime?: string, endTime?: string) {
    if (!startTime || !endTime) return;
    if (startTime >= endTime) throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
  }

  private toTimeString(date: Date) {
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private parseTimeString(time: string) {
    const [hours, minutes] = time.split(':').map((part) => Number(part));
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
      throw new BadRequestException('Giờ không hợp lệ');
    }
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
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

  private isPubliclyVisible(minute: { status?: string; is_public?: boolean; creator?: { status?: string | null } | null }) {
    return this.isVisibleToNonOwner(minute) && (minute.creator?.status ?? USER_STATUS_ACTIVE) === USER_STATUS_ACTIVE;
  }

  private resolveDetailScope(
    minute: { created_by: number; status?: string; is_public?: boolean; creator?: { status?: string | null } | null },
    userId: number,
    roleId: number,
  ): MinuteViewScope {
    const creatorInactive = minute.creator && minute.creator.status !== USER_STATUS_ACTIVE;
    if (isSystemAdmin(roleId)) return 'owner';
    if (creatorInactive) throw new NotFoundException('Không tìm thấy biên bản');
    if (minute.created_by === userId) return 'owner';
    if (this.isVisibleToNonOwner(minute)) return 'authenticated_public';
    throw new ForbiddenException('Bạn không có quyền xem biên bản này');
  }

  private parseDateSafe(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    const date = new Date(`${value}T00:00:00.000+07:00`);
    if (isNaN(date.getTime())) throw new BadRequestException('Ngày tháng không hợp lệ');
    return date;
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
      this.stringifyTemplateData(data.template_data),
      ...(data.participants || []).flatMap((item: any) => [item.full_name, item.role_in_meeting]),
      ...(data.tasks || []).flatMap((item: any) => [item.task_content, item.assigned_to]),
    ].filter(Boolean);
    const joined = values.join('\n');
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(joined) || /(?:\+?84|0)(?:\d[\s.-]?){8,10}\d/.test(joined)) {
      throw new BadRequestException('Nội dung biên bản có email hoặc số điện thoại cá nhân. Hãy gỡ bỏ trước khi công khai.');
    }
  }

  private stringifyTemplateData(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
}
