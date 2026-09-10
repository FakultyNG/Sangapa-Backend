import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationStatus } from '@prisma/client';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let moduleRef: TestingModule;
  let prisma: {
    notification: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let email: {
    sendEmail: jest.Mock<Promise<void>, [{ to: string; subject: string; text: string }]>;
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    email = {
      sendEmail: jest.fn<Promise<void>, [{ to: string; subject: string; text: string }]>(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('lists notifications for the authenticated user only', async () => {
    prisma.notification.findMany.mockResolvedValueOnce([]);

    await service.list('user-id', NotificationStatus.UNREAD, 10);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        status: NotificationStatus.UNREAD,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
  });

  it('marks an owned notification read', async () => {
    prisma.notification.findFirst.mockResolvedValueOnce({ id: 'notification-id' });
    prisma.notification.update.mockResolvedValueOnce({
      id: 'notification-id',
      status: NotificationStatus.READ,
    });

    await service.markRead('user-id', 'notification-id');

    const updateCall = prisma.notification.update.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(updateCall.where).toEqual({ id: 'notification-id' });
    expect(updateCall.data.status).toBe(NotificationStatus.READ);
    expect(updateCall.data.readAt).toBeInstanceOf(Date);
  });

  it('does not mark another user notification read', async () => {
    prisma.notification.findFirst.mockResolvedValueOnce(null);

    await expect(service.markRead('user-id', 'other-notification-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('marks all unread notifications read for one user', async () => {
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 3 });

    await expect(service.markAllRead('user-id')).resolves.toEqual({ updated: 3 });
    const updateManyCall = prisma.notification.updateMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(updateManyCall.where).toEqual({
      userId: 'user-id',
      status: NotificationStatus.UNREAD,
    });
    expect(updateManyCall.data.status).toBe(NotificationStatus.READ);
    expect(updateManyCall.data.readAt).toBeInstanceOf(Date);
  });

  it('toggles email notification preference', async () => {
    prisma.user.update.mockResolvedValueOnce({ emailNotificationsEnabled: false });

    await expect(service.updateEmailPreference('user-id', false)).resolves.toEqual({
      emailNotificationsEnabled: false,
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 'user-id',
      },
      data: {
        emailNotificationsEnabled: false,
      },
      select: {
        emailNotificationsEnabled: true,
      },
    });
  });

  it('sends email for created notification only when enabled', async () => {
    prisma.notification.create.mockResolvedValueOnce({ id: 'notification-id' });
    prisma.user.findUnique.mockResolvedValueOnce({
      email: 'user@example.com',
      emailNotificationsEnabled: true,
    });

    await service.createForUser({
      userId: 'user-id',
      type: 'deposit.completed',
      title: 'Deposit completed',
      body: 'Your deposit completed.',
    });

    expect(email.sendEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Deposit completed',
      text: 'Your deposit completed.',
    });
  });

  it('does not send email when disabled', async () => {
    prisma.notification.create.mockResolvedValueOnce({ id: 'notification-id' });
    prisma.user.findUnique.mockResolvedValueOnce({
      email: 'user@example.com',
      emailNotificationsEnabled: false,
    });

    await service.createForUser({
      userId: 'user-id',
      type: 'deposit.completed',
      title: 'Deposit completed',
      body: 'Your deposit completed.',
    });

    expect(email.sendEmail).not.toHaveBeenCalled();
  });
});
