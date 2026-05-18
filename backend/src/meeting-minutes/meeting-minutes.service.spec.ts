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
  attachments: [],
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
  it('allows logged-in users to view a full public minute without approval status', async () => {
    const { service } = createService();

    await expect(service.findOne(10, 99, 4)).resolves.toMatchObject({
      minute_id: 10,
      discussion_content: 'Nội dung hop',
      attachments: [],
    });
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

    await expect(service.findOne(10, 99, 4)).rejects.toBeInstanceOf(ForbiddenException);
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
    }, 2)).rejects.toThrow('Mã biên bản da ton tai');
  });
});
