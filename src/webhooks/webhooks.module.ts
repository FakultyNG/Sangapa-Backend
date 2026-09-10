import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ReepayWebhookController } from './reepay-webhook.controller';
import { ReepayWebhookService } from './reepay-webhook.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ReepayWebhookController],
  providers: [ReepayWebhookService],
})
export class WebhooksModule {}
