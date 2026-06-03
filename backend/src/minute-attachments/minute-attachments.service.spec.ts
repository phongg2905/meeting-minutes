import { ForbiddenException } from '@nestjs/common';
import { MinuteAttachmentsService } from './minute-attachments.service';

const minute = {
  minute_id: 10,
  created_by: 2,
  status: 'completed',
  is_public: true,
  creator: { status: 'active' },
};

const unsafeAttachment = {
  attachment_id: 5,
  minute_id: 10,
  uploaded_by: 2,
  file_name: 'internal.pdf',
  file_path: 'minute-attachments/10/internal.pdf',
  file_type: 'application/pdf',
  is_public_safe: false,
  public_scan_status: 'pending',
  uploaded_at: new Date('2026-06-01T08:00:00Z'),
  minute,
};

function createService(overrides: any = {}) {
  const prisma = {
    meetingMinute: {
      findUnique: jest.fn().mockResolvedValue(minute),
    },
    minuteAttachment: {
      findUnique: jest.fn().mockResolvedValue(unsafeAttachment),
      findMany: jest.fn().mockResolvedValue([unsafeAttachment]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ...overrides,
  };
  const activityLogs = { log: jest.fn().mockResolvedValue({}) };
  return { service: new MinuteAttachmentsService(prisma as any, activityLogs as any), prisma, activityLogs };
}

describe('MinuteAttachmentsService', () => {
  it('blocks non-owner download when attachment is not public-safe', async () => {
    const { service } = createService();

    await expect(service.getDownload(5, 99, 3)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns only sanitized public-safe attachments for authenticated public access', async () => {
    const safeAttachment = {
      ...unsafeAttachment,
      attachment_id: 6,
      file_name: 'public.pdf',
      file_path: 'minute-attachments/10/public.pdf',
      is_public_safe: true,
      public_scan_status: 'approved',
    };
    const { service, prisma } = createService({
      minuteAttachment: {
        findUnique: jest.fn().mockResolvedValue({ ...unsafeAttachment, is_public_safe: true }),
        findMany: jest.fn().mockResolvedValue([safeAttachment]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    });

    const result = await service.findByMinute(10, 99, 3);

    expect(prisma.minuteAttachment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        is_public_safe: true,
      }),
    }));
    expect(result).toEqual([
      expect.objectContaining({
        attachment_id: 6,
        file_name: 'public.pdf',
        is_public_safe: true,
      }),
    ]);
    expect(result[0]).not.toHaveProperty('file_path');
    expect(result[0]).not.toHaveProperty('uploaded_by');
  });
});
