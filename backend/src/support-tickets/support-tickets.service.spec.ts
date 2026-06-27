import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ROLE_ADMIN, ROLE_STANDARD_USER } from '../auth/roles.constants';

describe('SupportTicketsService', () => {
  let service: SupportTicketsService;
  let prisma: any;
  let activityLogs: any;
  let notifications: any;

  const mockAdmin = { user_id: 1, role_id: ROLE_ADMIN };
  const mockUser = { user_id: 2, role_id: ROLE_STANDARD_USER };
  const mockOtherUser = { user_id: 3, role_id: ROLE_STANDARD_USER };

  const mockTicket = {
    ticket_id: 1,
    requested_by: mockUser.user_id,
    title: 'Test ticket',
    content: 'Test content',
    category: null,
    status: 'PENDING',
    response: null,
    resolution: null,
    assigned_admin: null,
    handled_by: null,
    resolved_by: null,
    resolved_at: null,
    last_message_at: new Date(),
    created_at: new Date(),
    updated_at: null,
  };

  const mockMessage = {
    message_id: 1,
    ticket_id: 1,
    sender_id: mockUser.user_id,
    sender_type: 'USER',
    content: 'Test message',
    created_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      supportTicket: {
        create: jest.fn().mockResolvedValue(mockTicket),
        findMany: jest.fn().mockResolvedValue([mockTicket]),
        findUnique: jest.fn().mockResolvedValue(mockTicket),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue({ ...mockTicket }),
      },
      supportMessage: {
        create: jest.fn().mockResolvedValue(mockMessage),
      },
      supportAttachment: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    activityLogs = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    notifications = {
      createForRoles: jest.fn().mockResolvedValue({ count: 0 }),
      createForUser: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportTicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogsService, useValue: activityLogs },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<SupportTicketsService>(SupportTicketsService);
  });

  // ============================================================
  // 1. User tạo ticket
  // ============================================================
  describe('create', () => {
    it('should create a ticket with PENDING status and notify admin', async () => {
      const dto = { title: 'Test ticket', content: 'Test content' };
      const result = await service.create(mockUser.user_id, dto);

      expect(prisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requested_by: mockUser.user_id,
            title: 'Test ticket',
            content: 'Test content',
            status: 'PENDING',
          }),
        }),
      );
      expect(notifications.createForRoles).toHaveBeenCalledWith(
        [ROLE_ADMIN],
        expect.objectContaining({ type: 'NEW_SUPPORT_REQUEST' }),
        [mockUser.user_id],
      );
      expect(activityLogs.log).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 2. Admin nhận notification
  // ============================================================
  describe('findAll', () => {
    it('should return all tickets for admin', async () => {
      const result = await service.findAll(mockAdmin.user_id, ROLE_ADMIN, {});
      expect(prisma.supportTicket.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should return only user tickets for non-admin', async () => {
      await service.findAll(mockUser.user_id, ROLE_STANDARD_USER, {});
      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requested_by: mockUser.user_id,
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      await service.findAll(mockAdmin.user_id, ROLE_ADMIN, { status: 'PENDING' });
      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });
  });

  // ============================================================
  // 3. User không thể xem ticket của người khác
  // ============================================================
  describe('findOne', () => {
    it('should allow admin to see any ticket', async () => {
      const result = await service.findOne(1, mockAdmin.user_id, ROLE_ADMIN);
      expect(result).toBeDefined();
    });

    it('should allow user to see own ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicket);
      const result = await service.findOne(1, mockUser.user_id, ROLE_STANDARD_USER);
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException when user tries to see another ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicket);
      await expect(
        service.findOne(1, mockOtherUser.user_id, ROLE_STANDARD_USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(null);
      await expect(
        service.findOne(999, mockAdmin.user_id, ROLE_ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // 4. Admin gửi message
  // ============================================================
  describe('addMessage (Admin)', () => {
    it('should allow admin to send message while PROCESSING', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'PROCESSING',
      });

      const result = await service.addMessage(
        1,
        mockAdmin.user_id,
        ROLE_ADMIN,
        { content: 'Admin message' },
      );

      expect(prisma.supportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sender_type: 'ADMIN',
            content: 'Admin message',
          }),
        }),
      );
      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            handled_by: mockAdmin.user_id,
          }),
        }),
      );
      expect(result.ticket_status).toBe('PROCESSING');
    });

    it('should transition PENDING to PROCESSING when admin sends first message', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicket);

      await service.addMessage(1, mockAdmin.user_id, ROLE_ADMIN, {
        content: 'Starting to process',
      });

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PROCESSING',
            handled_by: mockAdmin.user_id,
          }),
        }),
      );
    });

    it('should throw when admin sends message to COMPLETED ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'COMPLETED',
      });

      await expect(
        service.addMessage(1, mockAdmin.user_id, ROLE_ADMIN, {
          content: 'Late message',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when admin sends message while WAITING_FOR_USER', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'WAITING_FOR_USER',
      });

      await expect(
        service.addMessage(1, mockAdmin.user_id, ROLE_ADMIN, {
          content: 'Wait...',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // 5. Admin yêu cầu bổ sung thông tin
  // ============================================================
  describe('requestMoreInfo', () => {
    it('should transition to WAITING_FOR_USER and notify user', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'PROCESSING',
      });

      const result = await service.requestMoreInfo(
        1,
        mockAdmin.user_id,
        ROLE_ADMIN,
        { content: 'Please provide screenshot' },
      );

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'WAITING_FOR_USER',
            handled_by: mockAdmin.user_id,
          }),
        }),
      );
      expect(notifications.createForUser).toHaveBeenCalledWith(
        mockUser.user_id,
        expect.objectContaining({
          type: 'REQUEST_MORE_INFORMATION',
        }),
      );
      expect(result.status).toBe('WAITING_FOR_USER');
    });

    it('should allow requesting info from PENDING status', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicket);

      await service.requestMoreInfo(1, mockAdmin.user_id, ROLE_ADMIN, {
        content: 'Need more info',
      });

      expect(prisma.supportTicket.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.requestMoreInfo(1, mockUser.user_id, ROLE_STANDARD_USER, {
          content: 'Not allowed',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for COMPLETED ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'COMPLETED',
      });

      await expect(
        service.requestMoreInfo(1, mockAdmin.user_id, ROLE_ADMIN, {
          content: 'Too late',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // 6. User phản hồi (khi WAITING_FOR_USER)
  // ============================================================
  describe('addMessage (User)', () => {
    it('should allow user to reply when WAITING_FOR_USER and transition to PROCESSING', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'WAITING_FOR_USER',
      });

      const result = await service.addMessage(
        1,
        mockUser.user_id,
        ROLE_STANDARD_USER,
        { content: 'Here is the screenshot' },
      );

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PROCESSING' }),
        }),
      );
      expect(notifications.createForRoles).toHaveBeenCalledWith(
        [ROLE_ADMIN],
        expect.objectContaining({ type: 'SUPPORT_UPDATED' }),
      );
      expect(result.ticket_status).toBe('PROCESSING');
    });

    it('should throw when user replies without WAITING_FOR_USER status', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'PROCESSING',
      });

      await expect(
        service.addMessage(1, mockUser.user_id, ROLE_STANDARD_USER, {
          content: 'I want to reply',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when user replies to completed ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'COMPLETED',
      });

      await expect(
        service.addMessage(1, mockUser.user_id, ROLE_STANDARD_USER, {
          content: 'I want to reply',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user replies to another user ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'WAITING_FOR_USER',
        requested_by: 99,
      });

      await expect(
        service.addMessage(1, mockUser.user_id, ROLE_STANDARD_USER, {
          content: 'Hacked',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // 7. Admin hoàn thành ticket
  // ============================================================
  describe('complete', () => {
    it('should complete a PROCESSING ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'PROCESSING',
      });

      const result = await service.complete(1, mockAdmin.user_id, ROLE_ADMIN, {
        resolution: 'Password has been reset. You can login again.',
      });

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            resolution: 'Password has been reset. You can login again.',
            resolved_by: mockAdmin.user_id,
          }),
        }),
      );
      expect(notifications.createForUser).toHaveBeenCalledWith(
        mockUser.user_id,
        expect.objectContaining({ type: 'SUPPORT_COMPLETED' }),
      );
      expect(result.status).toBe('COMPLETED');
    });

    it('should complete even from PENDING status', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.complete(1, mockAdmin.user_id, ROLE_ADMIN, {
        resolution: 'Quick fix',
      });

      expect(result.status).toBe('COMPLETED');
    });

    it('should complete even from WAITING_FOR_USER status', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'WAITING_FOR_USER',
      });

      const result = await service.complete(1, mockAdmin.user_id, ROLE_ADMIN, {
        resolution: 'Done',
      });

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            resolution: 'Done',
          }),
        }),
      );
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw when completing already COMPLETED ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'COMPLETED',
      });

      await expect(
        service.complete(1, mockAdmin.user_id, ROLE_ADMIN, {
          resolution: 'Already done',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.complete(1, mockUser.user_id, ROLE_STANDARD_USER, {
          resolution: 'Not allowed',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // 8. Phân quyền tổng thể
  // ============================================================
  describe('permissions', () => {
    it('should throw ForbiddenException when non-admin calls admin-only methods', async () => {
      await expect(
        service.requestMoreInfo(1, mockUser.user_id, ROLE_STANDARD_USER, {
          content: 'Hack',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.complete(1, mockUser.user_id, ROLE_STANDARD_USER, {
          resolution: 'Hack',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
