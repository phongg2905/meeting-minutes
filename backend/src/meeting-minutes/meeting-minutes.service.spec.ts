import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MeetingMinutesService } from './meeting-minutes.service';

const baseMinute = {
  minute_id: 10,
  minute_code: 'BB-202605-0001',
  type_id: 1,
  created_by: 2,
  title: 'Họp lớp thang 5',
  class_name: 'CNTT01',
  meeting_date: new Date('2026-05-18'),
  start_time: new Date('1970-01-01T08:00:00'),
  end_time: new Date('1970-01-01T09:00:00'),
  location: 'A101',
  meeting_form: 'Trực tiếp',
  host_name: 'Nguyen Van A',
  secretary_name: 'Tran Thi B',
  attendee_summary: '30 sinh vien',
  absentee_summary: null,
  purpose: 'Sinh hoat lop',
  discussion_content: 'Nội dung hop',
  conclusion_content: null,
  followup_summary: null,
  status: 'completed',
  is_public: true,
  published_at: new Date('2026-05-18T02:00:00Z'),
  created_at: new Date('2026-05-18T01:00:00Z'),
  updated_at: null,
  creator: { user_id: 2, full_name: 'Creator', email: 'creator@example.com', status: 'active' },
  minute_type: { type_id: 1, type_name: 'Sinh hoat lop' },
  tasks: [],
  participants: [],
  attachments: [
    {
      attachment_id: 1,
      minute_id: 10,
      uploaded_by: 2,
      file_name: 'public-safe.pdf',
      file_path: 'minute-attachments/10/public-safe.pdf',
      file_type: 'application/pdf',
      is_public_safe: true,
      public_scan_status: 'approved',
      uploaded_at: new Date('2026-05-18T03:00:00Z'),
      uploader: { user_id: 2, full_name: 'Creator' },
    },
    {
      attachment_id: 2,
      minute_id: 10,
      uploaded_by: 2,
      file_name: 'internal-only.pdf',
      file_path: 'minute-attachments/10/internal-only.pdf',
      file_type: 'application/pdf',
      is_public_safe: false,
      public_scan_status: 'pending',
      uploaded_at: new Date('2026-05-18T04:00:00Z'),
      uploader: { user_id: 2, full_name: 'Creator' },
    },
  ],
};

function createService(overrides: any = {}) {
  const prisma = {
    meetingMinute: {
      findUnique: jest.fn().mockResolvedValue(baseMinute),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    minuteParticipant: { deleteMany: jest.fn() },
    minuteTask: { deleteMany: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue({ user_id: 2, role_id: 2 }) },
    $transaction: jest.fn((cb) => cb(prisma)),
    ...overrides,
  };
  const activityLogs = { log: jest.fn().mockResolvedValue({}) };
  const notifications = {
    createForRoles: jest.fn().mockResolvedValue({ count: 0 }),
  };
  return { service: new MeetingMinutesService(prisma as any, activityLogs as any, notifications as any), prisma, activityLogs, notifications };
}

describe('MeetingMinutesService permissions', () => {
  it('sanitizes internal fields for non-owner viewing a public minute', async () => {
    const { service } = createService();

    const result = await service.findOne(10, 99, 3);

    expect(result.creator).toEqual({
      user_id: 2,
      full_name: 'Creator',
    });
    expect(result.attachments).toEqual([
      expect.objectContaining({
        attachment_id: 1,
        file_name: 'public-safe.pdf',
        is_public_safe: true,
      }),
    ]);
    expect(result.attachments).toHaveLength(1);
    expect(result.creator).not.toHaveProperty('email');
    expect(result.attachments[0]).not.toHaveProperty('file_path');
    expect(result.attachments[0]).not.toHaveProperty('uploaded_by');
  });

  it('blocks a minute manager from editing another creator minute', async () => {
    const { service } = createService();

    await expect(service.update(10, { title: 'Sửa tiêu đề' }, 99, 2)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps a public minute public after content edit by its creator', async () => {
    const { service, prisma } = createService();
    prisma.meetingMinute.update.mockResolvedValue({ ...baseMinute, title: 'Tiêu đề moi', is_public: true });

    await service.update(10, { title: 'Tiêu đề moi' }, 2, 2);

    expect(prisma.meetingMinute.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: 'Tiêu đề moi',
      }),
    }));
    expect(prisma.meetingMinute.update.mock.calls[0][0].data.status).toBeUndefined();
    expect(prisma.meetingMinute.update.mock.calls[0][0].data.is_public).toBeUndefined();
    expect(prisma.meetingMinute.update.mock.calls[0][0].data.reviewed_by).toBeUndefined();
  });

  it('strips existing child ids before recreating participants and tasks', async () => {
    const { service, prisma } = createService();
    prisma.meetingMinute.update.mockResolvedValue({ ...baseMinute, status: 'completed', is_public: true });

    await service.update(10, {
      participants: [
        {
          participant_id: 31,
          minute_id: 10,
          full_name: 'Nguyen Van A',
          role_in_meeting: 'Chủ tọa',
          attendance_status: 'present',
        } as any,
      ],
      tasks: [
        {
          task_id: 15,
          minute_id: 10,
          task_content: 'Tổng hop so lieu',
          assigned_to: 'Tran Thi B',
          deadline: '2026-05-30',
          task_status: 'done',
        } as any,
      ],
    }, 2, 2);

    expect(prisma.meetingMinute.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        participants: {
          createMany: {
            data: [
              {
                full_name: 'Nguyen Van A',
                role_in_meeting: 'Chủ tọa',
                attendance_status: 'present',
              },
            ],
          },
        },
        tasks: {
          createMany: {
            data: [
              {
                task_content: 'Tổng hop so lieu',
                assigned_to: 'Tran Thi B',
                deadline: new Date('2026-05-30'),
                task_status: 'done',
              },
            ],
          },
        },
      }),
    }));
  });

  it('does not expose creator email in public listing query', async () => {
    const { service, prisma } = createService();

    await service.findPublic({});

    expect(prisma.meetingMinute.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        creator: { select: { user_id: true, full_name: true } },
      }),
    }));
  });

  it('hides public draft minutes from non-owners', async () => {
    const { service, prisma } = createService();
    prisma.meetingMinute.findUnique.mockResolvedValue({ ...baseMinute, status: 'draft', is_public: true });

    await expect(service.findOne(10, 99, 3)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('filters the owner list when mine is requested and keeps created_by in list items', async () => {
    const { service, prisma } = createService();
    prisma.meetingMinute.findMany.mockResolvedValue([baseMinute]);
    prisma.meetingMinute.count.mockResolvedValue(1);

    const result = await service.findAll({ mine: 'true' } as any, 99, 2);

    expect(prisma.meetingMinute.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ created_by: 99 }),
    }));
    expect(result.data[0]).toMatchObject({
      minute_id: 10,
      created_by: 2,
    });
  });

  it('returns a clear error when a provided minute code is duplicated', async () => {
    const { service, prisma } = createService();
    prisma.meetingMinute.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );

    await expect(service.create({
      minute_code: 'BB-DUP',
      type_id: 1,
      title: 'Họp lớp',
      class_name: 'CNTT01',
      meeting_date: '2026-05-18',
      start_time: '08:00',
      end_time: '09:00',
      discussion_content: 'Nội dung',
    }, 2)).rejects.toThrow('Mã biên bản đã tồn tại');
  });

  it('uses the user-provided minute code after trimming whitespace', async () => {
    const { service, prisma } = createService();
    prisma.meetingMinute.create.mockResolvedValue({ ...baseMinute, minute_code: 'BB-CUSTOM-01' });

    await service.create({
      minute_code: '  BB-CUSTOM-01  ',
      type_id: 1,
      title: 'Hop lop',
      class_name: 'CNTT01',
      meeting_date: '2026-05-18',
      start_time: '08:00',
      end_time: '09:00',
      discussion_content: 'Noi dung',
    }, 2);

    expect(prisma.meetingMinute.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        minute_code: 'BB-CUSTOM-01',
      }),
    }));
  });

  it('stores meeting times as UTC-based clock values to avoid timezone drift', async () => {
    const { service, prisma } = createService();
    prisma.meetingMinute.create.mockResolvedValue(baseMinute);

    await service.create({
      minute_code: 'BB-TIME',
      type_id: 1,
      title: 'Hop lop',
      class_name: 'CNTT01',
      meeting_date: '2026-05-18',
      start_time: '08:00',
      end_time: '09:00',
      discussion_content: 'Noi dung',
    }, 2);

    const createArgs = prisma.meetingMinute.create.mock.calls[0][0];
    expect((createArgs.data.start_time as Date).getUTCHours()).toBe(8);
    expect((createArgs.data.start_time as Date).getUTCMinutes()).toBe(0);
    expect((createArgs.data.end_time as Date).getUTCHours()).toBe(9);
    expect((createArgs.data.end_time as Date).getUTCMinutes()).toBe(0);
  });
});
