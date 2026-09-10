import { Body, Controller, Headers, Post, Req } from '@nestjs/common';

import { RequestWithId } from '../common/types/request-with-id';
import { ReepayWebhookService } from './reepay-webhook.service';
import { ReepayWebhookResult } from './reepay-webhook.types';

@Controller('webhooks/reepay')
export class ReepayWebhookController {
  constructor(private readonly webhooks: ReepayWebhookService) {}

  @Post()
  receive(
    @Req() request: RequestWithId,
    @Body() payload: unknown,
    @Headers('x-reepay-signature') signature?: string,
    @Headers('x-reepay-event') eventType?: string,
    @Headers('x-reepay-event-id') eventId?: string,
    @Headers('x-reepay-timestamp') timestamp?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<ReepayWebhookResult> {
    return this.webhooks.handle(
      {
        signature,
        eventType,
        eventId,
        timestamp,
        requestId,
      },
      request.rawBody ?? Buffer.from(JSON.stringify(payload ?? {})),
      payload,
    );
  }
}
