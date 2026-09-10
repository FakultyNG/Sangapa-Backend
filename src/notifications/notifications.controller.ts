import { Body, Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { Notification } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-request';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { UpdateEmailNotificationsDto } from './dto/update-email-notifications.dto';
import { NotificationsService } from './notifications.service';
import { EmailNotificationPreference } from './notifications.types';

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<Notification[]> {
    return this.notifications.list(user.id, query.status, query.limit ?? 20);
  }

  @Patch('notifications/:id/read')
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') notificationId: string,
  ): Promise<Notification> {
    return this.notifications.markRead(user.id, notificationId);
  }

  @Patch('notifications/read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<{ updated: number }> {
    return this.notifications.markAllRead(user.id);
  }

  @Get('settings/email-notifications')
  getEmailPreference(@CurrentUser() user: AuthenticatedUser): Promise<EmailNotificationPreference> {
    return this.notifications.getEmailPreference(user.id);
  }

  @Patch('settings/email-notifications')
  updateEmailPreference(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEmailNotificationsDto,
  ): Promise<EmailNotificationPreference> {
    return this.notifications.updateEmailPreference(user.id, dto.enabled);
  }
}
