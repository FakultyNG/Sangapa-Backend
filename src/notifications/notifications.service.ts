import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, NotificationStatus, Prisma } from '@prisma/client';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationPreference } from './notifications.types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  list(userId: string, status?: NotificationStatus, limit = 20): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        status,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async markRead(userId: string, notificationId: string): Promise<Notification> {
    await this.findOwnedOrThrow(userId, notificationId);

    return this.prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async getEmailPreference(userId: string): Promise<EmailNotificationPreference> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        emailNotificationsEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      emailNotificationsEnabled: user.emailNotificationsEnabled,
    };
  }

  async updateEmailPreference(
    userId: string,
    enabled: boolean,
  ): Promise<EmailNotificationPreference> {
    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        emailNotificationsEnabled: enabled,
      },
      select: {
        emailNotificationsEnabled: true,
      },
    });

    return {
      emailNotificationsEnabled: user.emailNotificationsEnabled,
    };
  }

  async createForUser(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    payload?: Prisma.InputJsonValue;
    sendEmail?: boolean;
  }): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload,
      },
    });

    if (input.sendEmail ?? true) {
      await this.sendEmailIfEnabled(input.userId, input.title, input.body);
    }

    return notification;
  }

  private async sendEmailIfEnabled(userId: string, title: string, body: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
        emailNotificationsEnabled: true,
      },
    });

    if (!user?.emailNotificationsEnabled) {
      return;
    }

    await this.email.sendEmail({
      to: user.email,
      subject: title,
      text: body,
    });
  }

  private async findOwnedOrThrow(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }
}
